import Property from "../models/property.model.js";
import Room from "../models/room.model.js";
import mongoose from "mongoose";
import { fetchUserData } from "./internal.service.js";
import PropertyLog from "../models/propertyLog.model.js";

export const addRoom = async (data) => {
  const {
    roomNo,
    roomCapacity,
    status,
    propertyId,
    propertyName,
    isHeavens,
    sharingType,
    description,
    adminName,
  } = data;

  // ✅ Validate required fields
  if (
    !propertyId ||
    !roomNo ||
    !roomCapacity ||
    !propertyName ||
    !sharingType
  ) {
    return { status: 400, message: "Missing required fields" };
  }

  // ✅ Fetch property
  const property = await Property.findById(propertyId);
  if (!property) {
    return { status: 404, message: "Property not found" };
  }

  // ✅ Check if sharingType exists
  if (
    !(
      property.sharingPrices instanceof Map &&
      property.sharingPrices.has(sharingType)
    )
  ) {
    return {
      status: 400,
      message: `${sharingType} is not defined in this property's sharing prices.`,
    };
  }

  // ✅ Check if room already exists
  const existingRoom = await Room.findOne({ propertyId, roomNo });
  if (existingRoom) {
    return {
      status: 409,
      message: "Room number already exists under this property",
    };
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const newRoom = new Room({
      roomNo,
      roomCapacity,
      status: status || "available",
      propertyId,
      propertyName,
      sharingType,
      occupant: 0,
      vacantSlot: roomCapacity,
      isHeavens,
      description,
    });

    const savedRoom = await newRoom.save({ session });

    const updatedProperty = await Property.findByIdAndUpdate(
      propertyId,
      { $inc: { totalBeds: roomCapacity } },
      { new: true, session }
    );

    if (!updatedProperty) {
      throw new Error("Property not found after room creation");
    }

    await session.commitTransaction();
    session.endSession();

      try {
        await PropertyLog.create({
          propertyId,
          action: "update",
          category: "property",
          changedByName: adminName,
          message: `Room ${roomNo} (capacity: ${roomCapacity}, sharing type: ${sharingType}) added to property "${propertyName}" by ${adminName}`,
        });
      } catch (logError) {
        console.error("Failed to save property log (addRoom):", logError);
      }

    return {
      status: 200,
      data: {
        room: savedRoom,
        updatedPropertyStats: {
          totalBeds: updatedProperty.totalBeds,
        },
      },
    };
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    return {
      status: 500,
      message: error.message || "Server error while adding room",
    };
  }
};

export const confirmRoomAssignment = async (data) => {
  const { userId, roomId, userType } = data;
  // console.log(data);
  // Validation
  if (!userId || !roomId || !userType) {
    return {
      status: 400,
      body: { error: "Missing userId, roomId, or userType" },
    };
  }

  if (!["longTermResident", "dailyRenter"].includes(userType)) {
    return { status: 400, body: { error: "Invalid userType" } };
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const room = await Room.findById(roomId).session(session);
    if (!room) {
      await session.abortTransaction();
      return { status: 404, body: { error: "Room not found" } };
    }

    if (room.vacantSlot <= 0) {
      await session.abortTransaction();
      return { status: 400, body: { error: "Room is full" } };
    }

    // Check if already assigned to this specific room
    const alreadyAssigned = room.roomOccupants?.some(
      (occ) => occ.userId.equals(userId) && occ.userType === userType
    );
    if (alreadyAssigned) {
      await session.abortTransaction();
      return {
        status: 400,
        body: { error: "User already assigned to this room" },
      };
    }

    // Check if user already in another room
    const existingAssignment = await Room.findOne({
      "roomOccupants.userId": userId,
      "roomOccupants.userType": userType,
    }).session(session);

    const userAssignedToAnotherRoom =
      existingAssignment && !existingAssignment._id.equals(roomId);

    // Remove from old room if assigned elsewhere
    if (userAssignedToAnotherRoom) {
      existingAssignment.occupant -= 1;
      existingAssignment.vacantSlot += 1;
      existingAssignment.roomOccupants =
        existingAssignment.roomOccupants.filter(
          (occ) => !(occ.userId.equals(userId) && occ.userType === userType)
        );
      await existingAssignment.save({ session });

      // If property is different, update the property occupiedBeds count
      if (!existingAssignment.propertyId.equals(room.propertyId)) {
        await Property.findByIdAndUpdate(
          existingAssignment.propertyId,
          { $inc: { occupiedBeds: -1 } },
          { session }
        );
      }
    }

    // Add to new room
    room.occupant += 1;
    room.vacantSlot -= 1;
    if (!room.roomOccupants) room.roomOccupants = [];
    room.roomOccupants.push({ userId, userType });
    await room.save({ session });

    // Update property count if property changed
    if (
      !existingAssignment ||
      !existingAssignment.propertyId.equals(room.propertyId)
    ) {
      await Property.findByIdAndUpdate(
        room.propertyId,
        { $inc: { occupiedBeds: 1 } },
        { session }
      );
    }

    await session.commitTransaction();
    return {
      status: 200,
      body: {
        message: "Room assigned successfully",
        room: {
          _id: room._id,
          roomNo: room.roomNo,
          propertyName: room.propertyName,
          propertyId: room.propertyId,
          sharingType: room.sharingType,
          vacantSlot: room.vacantSlot,
          occupant: room.occupant,
          roomOccupants: room.roomOccupants,
        },
      },
    };
  } catch (err) {
    await session.abortTransaction();
    console.error("Error in confirming room assignment:", err);
    return { status: 500, body: { error: "Internal server error" } };
  }
};

export const handleRemoveAssignment = async (data) => {
  const { userId, roomId } = data;
  let session; // Declare session here

  try {
    session = await mongoose.startSession(); // Assign it here
    session.startTransaction();

    const room = await Room.findById(roomId).session(session);
    console.log(room);
    if (!room) {
      await session.abortTransaction();
      return {
        status: 404,
        body: { error: "Room not found" },
      };
    }

    // Remove occupant from room
    room.occupant -= 1;
    room.vacantSlot += 1;
    room.roomOccupants = room.roomOccupants.filter(
      (occ) => !occ.userId.equals(userId)
    );

    await room.save({ session });

    await Property.findByIdAndUpdate(
      room.propertyId,
      { $inc: { occupiedBeds: -1 } },
      { session }
    );

    await session.commitTransaction();
    return {
      status: 200,
      body: { success: true },
    };
  } catch (error) {
    if (session) {
      await session.abortTransaction();
    }
    console.error("Error removing room assignment:", error);
    return {
      status: 500,
      body: { error: "Failed to remove room assignment" },
    };
  } finally {
    if (session) {
      session.endSession(); // Clean up
    }
  }
};

export const updateRoom = async (data) => {
  const { id, roomNo, roomCapacity, status, adminName } = data;

  try {
    // ✅ Find room by ID
    const room = await Room.findById(id);
    if (!room) {
      return { status: 404, message: "Room not found" };
    }

    // ✅ Check for duplicate roomNo
    if (roomNo && roomNo !== room.roomNo) {
      const existingRoom = await Room.findOne({
        propertyId: room.propertyId,
        roomNo: roomNo,
      });
      if (existingRoom) {
        return {
          status: 409,
          message: "Room number already exists under this property",
        };
      }
      room.roomNo = roomNo;
    }

    // ✅ Fetch property
    const property = await Property.findById(room.propertyId);
    if (!property) {
      return { status: 404, message: "Property not found" };
    }

    // ✅ Check if sharingType exists in property
    if (
      !(
        property.sharingPrices instanceof Map &&
        property.sharingPrices.has(`${roomCapacity} Sharing`)
      )
    ) {
      return {
        status: 400,
        message: `${roomCapacity} Sharing is not defined in this property's sharing prices.`,
      };
    }

    // ✅ Update roomCapacity
    if (roomCapacity && roomCapacity !== room.roomCapacity) {
      if (roomCapacity < room.occupant) {
        return {
          status: 400,
          message: `Room capacity cannot be less than current occupants (${room.occupant})`,
        };
      }
      room.roomCapacity = roomCapacity;
      room.sharingType = `${roomCapacity} Sharing`;
      room.vacantSlot = roomCapacity - room.occupant;
    }

    // ✅ Update status if provided
    if (status) {
      room.status = status;
    }

    // ✅ Save updated room
    const updatedRoom = await room.save();

    // ✅ Return success response
    return {
      status: 200,
      data: updatedRoom,
    };
  } catch (error) {
    console.error("Error in updateRoom service:", error);
    return {
      status: 500,
      message: error.message || "Server error while updating room",
    };
  }
};

export const deleteRoom = async (data) => {
  try {
    const { id, adminName } = data;

    // ✅ Find and delete the room
    const deletedRoom = await Room.findByIdAndDelete(id);

    if (!deletedRoom) {
      return { status: 404, message: "Room not found" };
    }

    // ✅ Fetch the property for logging
      const property = await Property.findById(deletedRoom.propertyId);
      if (property) {
        try {
          await PropertyLog.create({
            propertyId: property._id,
            action: "delete",
            category: "property",
            changedByName: adminName,
            message: `Room ${deletedRoom.roomNo} deleted from property "${property.propertyName}" by ${adminName}`,
          });
        } catch (logError) {
          console.error("Failed to save property log (deleteRoom):", logError);
        }
      }

    return {
      status: 200,
      message: "Room deleted successfully",
      data: deletedRoom,
    };
  } catch (error) {
    console.error("Error deleting room:", error);
    return {
      status: 500,
      message: error.message || "Server error while deleting room",
    };
  }
};

export const getRoomsByPropertyId = async (data) => {
  try {
    const { propertyId } = data;

    if (!propertyId) {
      return { status: 400, message: "PropertyId is required" };
    }

    const rooms = await Room.find({ propertyId });

    if (!rooms || rooms.length === 0) {
      return {
        status: 404,
        message: "No rooms found for this property",
      };
    }

    return {
      status: 200,
      data: rooms,
    };
  } catch (error) {
    console.error("Error fetching rooms by propertyId:", error);
    return {
      status: 500,
      message: error.message || "Server error while fetching rooms",
    };
  }
};

export const getRoomOccupants = async (data) => {
  try {
    const { roomId } = data;

    if (!roomId) {
      return { status: 400, message: "roomId is required" };
    }

    const room = await Room.findById(roomId);
    if (!room) {
      return { status: 404, message: "Room not found" };
    }

    const occupants = [];

    try {
      const userData = await fetchUserData(roomId); // returns { status, body: [ ...users ] }

      // ✅ iterate directly on userData.body (array)
      for (const user of userData.body) {
        occupants.push({
          occupantDetails: {
            name: user.name,
            contact: user.contact,
            userType: user.userType,
            paymentStatus: user.paymentStatus,
          },
        });
      }
    } catch (err) {
      console.error("Error fetching user data:", err.message);
      occupants.push({
        occupantDetails: null,
        error: "User data could not be fetched",
      });
    }

    return {
      status: 200,
      data: {
        roomId,
        occupantCount: occupants.length,
        occupants,
      },
    };
  } catch (error) {
    console.error("Error in getRoomOccupants service:", error);
    return {
      status: 500,
      message:
        error.message || "Internal server error while fetching occupants",
    };
  }
};

export const getAvailableRoomsByProperty = async (data) => {
  try {
    const { propertyId } = data;

    if (!propertyId) {
      return { status: 400, message: "propertyId is required" };
    }

    const roomFilter = {
      propertyId,
      status: "available",
      vacantSlot: { $ne: 0 },
    };

    const rooms = await Room.find(roomFilter);

    const property = await Property.findById(propertyId).select(
      "sharingPrices deposit"
    );

    if (!property) {
      return { status: 404, message: "Property not found" };
    }

    if (!rooms.length) {
      return {
        status: 404,
        message: "No available rooms with vacant slots found for this property",
      };
    }

    return {
      status: 200,
      data: {
        rooms,
        pricing: {
          sharingPrices: property.sharingPrices,
          deposit: property.deposit,
        },
      },
    };
  } catch (error) {
    console.error("Error in getAvailableRoomsByProperty service:", error);
    return {
      status: 500,
      message: error.message || "Server error while fetching available rooms",
    };
  }
};

export const getAllHeavensRooms = async (data) => {
  try {
    const query = { isHeavens: true };
    if (data.propertyId && data.propertyId !== "null") {
      query.propertyId = data.propertyId;
    }

    const rooms = await Room.find(query);
    if (!rooms || rooms.length === 0) {
      return { status: 404, message: "No Heavens rooms found" };
    }

    return { status: 200, data: rooms };
  } catch (error) {
    console.error("Error in getAllHeavensRooms service:", error);
    return {
      status: 500,
      message: error.message || "Server error while fetching Heavens rooms",
    };
  }
};
