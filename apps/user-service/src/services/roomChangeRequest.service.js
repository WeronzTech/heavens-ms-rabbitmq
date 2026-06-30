import mongoose from "mongoose";
import RoomChangeRequest from "../models/roomChangeRequest.model.js";
import User from "../models/user.model.js";
import { sendRPCRequest } from "../../../../libs/common/rabbitMq.js";
import { PROPERTY_PATTERN } from "../../../../libs/patterns/property/property.pattern.js";

export const createRoomChangeRequest = async (data) => {
  try {
    const { userId, requestedRoomId, reason } = data;

    if (!userId || !requestedRoomId) {
      return { status: 400, message: "userId and requestedRoomId are required" };
    }

    // 1. Fetch user details
    const user = await User.findById(userId);
    if (!user) {
      return { status: 404, message: "User not found" };
    }

    const { stayDetails } = user;
    if (!stayDetails || !stayDetails.roomId || !stayDetails.roomNumber) {
      return { status: 400, message: "User does not have an active room assignment" };
    }

    // 2. Fetch requested room details from Property Service via RPC
    const roomResponse = await sendRPCRequest(PROPERTY_PATTERN.ROOM.GET_ROOM_BY_ID, {
      roomId: requestedRoomId,
    });

    if (!roomResponse || roomResponse.status !== 200) {
      return {
        status: roomResponse?.status || 500,
        message: roomResponse?.message || "Failed to fetch requested room details",
      };
    }

    const requestedRoom = roomResponse.data;
    if (!requestedRoom) {
      return { status: 404, message: "Requested room not found" };
    }

    if (requestedRoom.vacantSlot <= 0) {
      return { status: 400, message: "Requested room has no vacant slots" };
    }

    // 3. Create request
    const request = new RoomChangeRequest({
      userId,
      propertyId: stayDetails.propertyId,
      currentRoomId: stayDetails.roomId,
      currentRoomNo: stayDetails.roomNumber,
      // currentBedId: stayDetails.bedId,
      // currentBedName: stayDetails.bedName || "N/A",
      requestedRoomId,
      requestedRoomNo: requestedRoom.roomNo,
      reason,
      status: "pending",
    });

    await request.save();

    return {
      status: 201,
      message: "Room change request submitted successfully",
      data: request,
    };
  } catch (error) {
    console.error("❌ Error in createRoomChangeRequest service:", error);
    return {
      status: 500,
      message: error.message || "Server error while submitting request",
    };
  }
};

export const getPendingRoomChangeRequests = async () => {
  try {
    const requests = await RoomChangeRequest.find({ status: "pending" })
      .populate("userId", "name contact personalDetails.profileImg personalDetails.gender stayDetails")
      .sort({ createdAt: -1 });

    // Format requests to align with standard panel schema
    const formattedRequests = requests.map((req) => {
      const user = req.userId || {};
      return {
        _id: req._id,
        userId: user._id,
        name: user.name,
        contact: user.contact,
        profileImg: user.personalDetails?.profileImg || "",
        gender: user.personalDetails?.gender || "",
        type: "room_change",
        currentRoom: req.currentRoomNo,
        currentRoomId: req.currentRoomId,
        requestedRoom: req.requestedRoomNo,
        propertyId: user.stayDetails?.propertyId,
        sharingType: user.stayDetails?.sharingType,
        reason: req.reason,
        createdAt: req.createdAt,
      };
    });

    return {
      status: 200,
      data: formattedRequests,
    };
  } catch (error) {
    console.error("❌ Error in getPendingRoomChangeRequests service:", error);
    return {
      status: 500,
      message: error.message || "Server error while fetching pending requests",
    };
  }
};

export const respondToRoomChangeRequest = async (data) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { requestId, action, adminId, rejectedReason, reassignRoomId } = data;

    if (!requestId || !action) {
      await session.abortTransaction();
      session.endSession();
      return { status: 400, message: "requestId and action are required" };
    }

    const request = await RoomChangeRequest.findById(requestId).session(session);
    if (!request) {
      await session.abortTransaction();
      session.endSession();
      return { status: 404, message: "Room change request not found" };
    }

    if (request.status !== "pending") {
      await session.abortTransaction();
      session.endSession();
      return { status: 400, message: "Request has already been processed" };
    }

    const user = await User.findById(request.userId).session(session);
    if (!user) {
      await session.abortTransaction();
      session.endSession();
      return { status: 404, message: "Resident not found" };
    }

    if (action === "rejected") {
      request.status = "rejected";
      request.rejectedReason = rejectedReason || "";
      request.reviewedBy = adminId;
      request.reviewedAt = new Date();
      await request.save({ session });

      await session.commitTransaction();
      session.endSession();

      return {
        status: 200,
        message: "Room change request rejected successfully",
        data: request,
      };
    }

    let targetRoomId = request.requestedRoomId;
    let finalStatus = "approved";

    if (action === "reassigned") {
      if (!reassignRoomId) {
        await session.abortTransaction();
        session.endSession();
        return { status: 400, message: "reassignRoomId is required for reassignment" };
      }
      targetRoomId = new mongoose.Types.ObjectId(reassignRoomId);
      finalStatus = "reassigned";
    }

    // 1. Fetch target room details from Property Service
    const roomResponse = await sendRPCRequest(PROPERTY_PATTERN.ROOM.GET_ROOM_BY_ID, {
      roomId: targetRoomId,
    });

    if (!roomResponse || roomResponse.status !== 200) {
      await session.abortTransaction();
      session.endSession();
      return {
        status: roomResponse?.status || 500,
        message: roomResponse?.message || "Failed to fetch target room details",
      };
    }

    const targetRoom = roomResponse.data;
    if (!targetRoom || targetRoom.vacantSlot <= 0) {
      await session.abortTransaction();
      session.endSession();
      return { status: 400, message: "Target room has no vacant slots" };
    }

    // 2. Fetch available beds in target room
    // const bedsResponse = await sendRPCRequest(PROPERTY_PATTERN.ROOM.GET_ROOM_OCCUPANTS, {
    //   roomId: targetRoomId,
    // });

    // Allocate first vacant bed
    // const totalCapacity = targetRoom.roomCapacity;
    // const occupiedBedIds = (bedsResponse?.data?.occupants || []).map((o) => o.occupantDetails?.bedId);
    
    // Query all beds for this room
    // const roomBedsResponse = await sendRPCRequest(PROPERTY_PATTERN.ROOM.GET_ROOM_OCCUPANTS, {
    //   roomId: targetRoomId,
    // });

    // RPC call to property service for beds list: we can invoke GET_AVAILABLE_ROOMS_BY_PROPERTY or confirm_assignment directly
    const assignmentResponse = await sendRPCRequest(PROPERTY_PATTERN.ROOM.CONFIRM_ASSIGNMENT, {
      userId: user._id,
      roomId: targetRoomId,
      userType: user.rentType === "monthly" ? "longTermResident" : "dailyRenter",
    });

    if (!assignmentResponse || assignmentResponse.status !== 200) {
      await session.abortTransaction();
      session.endSession();
      return {
        status: assignmentResponse?.status || 500,
        message: assignmentResponse?.message || "Failed to assign room in Property Service",
      };
    }

    const assignedRoom = assignmentResponse.body?.room || targetRoom;

    // Get bed data: we find first bed not in occupied list
    // let finalBedId = null;
    // let finalBedName = "Bed 1";

    // Query beds by room RPC
    // const bedsQueryResponse = await sendRPCRequest(PROPERTY_PATTERN.ROOM.GET_ROOM_OCCUPANTS, {
    //   roomId: targetRoomId,
    // });

    // Update user record inside transaction session
    user.stayDetails = {
      ...user.stayDetails,
      roomId: targetRoom._id,
      roomNumber: targetRoom.roomNo,
      sharingType: targetRoom.sharingType,
      // bedId: finalBedId,
      // bedName: finalBedName,
    };

    await user.save({ session });

    // Update request details
    request.status = finalStatus;
    request.assignedRoomId = targetRoom._id;
    request.assignedRoomNo = targetRoom.roomNo;
    // request.assignedBedId = finalBedId;
    // request.assignedBedName = finalBedName;
    request.reviewedBy = adminId;
    request.reviewedAt = new Date();
    await request.save({ session });

    await session.commitTransaction();
    session.endSession();

    return {
      status: 200,
      message: `Room change request ${finalStatus} successfully`,
      data: request,
    };
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("❌ Error in respondToRoomChangeRequest service:", error);
    return {
      status: 500,
      message: error.message || "Server error while processing room change response",
    };
  }
};

export const getUserRoomChangeRequests = async (data) => {
  try {
    const { userId } = data;
    if (!userId) {
      return { status: 400, message: "userId is required" };
    }

    const requests = await RoomChangeRequest.find({ userId }).sort({ createdAt: -1 });

    return {
      status: 200,
      data: requests,
    };
  } catch (error) {
    console.error("❌ Error in getUserRoomChangeRequests service:", error);
    return {
      status: 500,
      message: error.message || "Server error while fetching user room change requests",
    };
  }
};

export const checkPendingRoomChangeRequest = async (data) => {
  try {
    const { userId } = data;
    if (!userId) {
      return { status: 400, message: "userId is required" };
    }

    const pendingRequest = await RoomChangeRequest.findOne({ userId, status: "pending" });

    return {
      status: 200,
      data: {
        hasPending: !!pendingRequest,
        pendingRequest: pendingRequest || null,
      },
    };
  } catch (error) {
    console.error("❌ Error in checkPendingRoomChangeRequest service:", error);
    return {
      status: 500,
      message: error.message || "Server error while checking pending room change request",
    };
  }
};
