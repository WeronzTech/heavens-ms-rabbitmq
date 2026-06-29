import { sendRPCRequest } from "../../../../../libs/common/rabbitMq.js";
import { USER_PATTERN } from "../../../../../libs/patterns/user/user.pattern.js";
import { PROPERTY_PATTERN } from "../../../../../libs/patterns/property/property.pattern.js";

export const createRoomChangeRequest = async (req, res) => {
  try {
    const { requestedRoomId, reason } = req.body;
    const userId = req.userAuth;

    if (!requestedRoomId) {
      return res.status(400).json({ message: "requestedRoomId is required" });
    }

    const response = await sendRPCRequest(
      USER_PATTERN.USER.CREATE_ROOM_CHANGE_REQUEST,
      { userId, requestedRoomId, reason },
    );

    if (response.status === 201) {
      return res.status(201).json(response.data);
    } else {
      return res.status(response.status).json({
        message: response.message || "Failed to create room change request",
      });
    }
  } catch (error) {
    console.error(
      "❌ Error in createRoomChangeRequest gateway controller:",
      error,
    );
    return res.status(500).json({
      message:
        error.message || "Server error while creating room change request",
    });
  }
};

export const getPendingRoomChangeRequests = async (req, res) => {
  try {
    const response = await sendRPCRequest(
      USER_PATTERN.USER.GET_PENDING_ROOM_CHANGE_REQUESTS,
      {},
    );

    if (response.status === 200) {
      return res.status(200).json(response.data);
    } else {
      return res.status(response.status).json({
        message:
          response.message || "Failed to fetch pending room change requests",
      });
    }
  } catch (error) {
    console.error(
      "❌ Error in getPendingRoomChangeRequests gateway controller:",
      error,
    );
    return res.status(500).json({
      message: error.message || "Server error while fetching pending requests",
    });
  }
};

export const respondToRoomChangeRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { action, rejectedReason, reassignRoomId } = req.body;
    const adminId = req.userAuth;

    const response = await sendRPCRequest(
      USER_PATTERN.USER.RESPOND_TO_ROOM_CHANGE_REQUEST,
      { requestId, action, adminId, rejectedReason, reassignRoomId },
    );

    if (response.status === 200) {
      return res.status(200).json(response.data);
    } else {
      return res.status(response.status).json({
        message: response.message || "Failed to respond to room change request",
      });
    }
  } catch (error) {
    console.error(
      "❌ Error in respondToRoomChangeRequest gateway controller:",
      error,
    );
    return res.status(500).json({
      message:
        error.message || "Server error while responding to room change request",
    });
  }
};

export const getAvailableRoomsForMobile = async (req, res) => {
  try {
    const userId = req.userAuth;

    // Fetch user details first to get current property, sharingType, and gender
    const userResponse = await sendRPCRequest(
      USER_PATTERN.USER.GET_USER_BY_ID,
      {
        userId: userId,
      },
    );
    // console.log("userresponse", userResponse);

    if (!userResponse || userResponse.status !== 200) {
      return res.status(userResponse?.status || 500).json({
        message:
          userResponse?.message || "Failed to fetch user profile details",
      });
    }

    const user = userResponse.body.data;
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const { stayDetails, personalDetails } = user;
    if (!stayDetails || !stayDetails.propertyId || !stayDetails.sharingType) {
      return res
        .status(400)
        .json({ message: "User has no active stay details assigned" });
    }

    // Call getAvailableRoomsForChange with user's propertyId, sharingType, gender, and current room
    const roomsResponse = await sendRPCRequest(
      PROPERTY_PATTERN.ROOM.GET_AVAILABLE_ROOMS_FOR_CHANGE,
      {
        propertyId: stayDetails.propertyId,
        sharingType: stayDetails.sharingType,
        gender: personalDetails?.gender,
        currentRoomId: stayDetails.roomId,
      },
    );

    if (roomsResponse.status === 200) {
      return res.status(200).json(roomsResponse.data);
    } else {
      return res.status(roomsResponse.status).json({
        message: roomsResponse.message || "Failed to fetch available rooms",
      });
    }
  } catch (error) {
    console.error(
      "❌ Error in getAvailableRoomsForMobile gateway controller:",
      error,
    );
    return res.status(500).json({
      message:
        error.message ||
        "Server error while fetching available rooms for mobile",
    });
  }
};

export const getUserRoomChangeRequests = async (req, res) => {
  try {
    const userId = req.userAuth;

    const response = await sendRPCRequest(
      USER_PATTERN.USER.GET_USER_ROOM_CHANGE_REQUESTS,
      { userId },
    );

    if (response.status === 200) {
      return res.status(200).json(response.data);
    } else {
      return res.status(response.status).json({
        message:
          response.message || "Failed to fetch user room change requests",
      });
    }
  } catch (error) {
    console.error(
      "❌ Error in getUserRoomChangeRequests gateway controller:",
      error,
    );
    return res.status(500).json({
      message:
        error.message || "Server error while fetching room change requests",
    });
  }
};
