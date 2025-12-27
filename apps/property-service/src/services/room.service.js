import Property from "../models/property.model.js";
import Room from "../models/room.model.js";
import mongoose from "mongoose";
import { fetchUserData } from "./internal.service.js";
import PropertyLog from "../models/propertyLog.model.js";
import Floor from "../models/floor.model.js";

export const addRoom = async (data) => {
  const {
    roomNo,
    sharingType,
    roomCapacity,
    status,
    propertyId,
    propertyName,
    floorId,
    isHeavens,
    revenueGeneration,
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

  // ✅ Validate sharing type availability (if property has sharingPrices)
  if (
    property.sharingPrices &&
    property.sharingPrices instanceof Map &&
    !property.sharingPrices.has(sharingType)
  ) {
    return {
      status: 400,
      message: `${sharingType} is not defined in this property's sharing prices.`,
    };
  }

  // ✅ Check if room number already exists under this property
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
    // ✅ Create the new room
    const newRoom = new Room({
      roomNo,
      sharingType,
      roomCapacity,
      occupant: 0,
      vacantSlot: roomCapacity,
      status: status || "available",
      propertyId,
      propertyName,
      floorId,
      isHeavens,
      revenueGeneration:
        revenueGeneration !== undefined ? revenueGeneration : true,
      description,
    });

    const savedRoom = await newRoom.save({ session });

    // ✅ Add the new room ID to the floor (if floorId provided)
    if (floorId) {
      const Floor = mongoose.model("Floor"); // dynamically get Floor model
      await Floor.findByIdAndUpdate(
        floorId,
        { $addToSet: { roomIds: savedRoom._id } },
        { new: true, session }
      );
    }

    // ✅ Update totalBeds in property
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

    // ✅ Create Property Log (non-blocking)
    try {
      await PropertyLog.create({
        propertyId,
        action: "update",
        category: "property",
        changedByName: adminName,
        message: `Room ${roomNo} (capacity: ${roomCapacity}, sharing: ${sharingType}) added to property "${propertyName}" by ${adminName}`,
      });
    } catch (logError) {
      console.error("⚠️ Failed to save property log (addRoom):", logError);
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
    console.error("❌ Error in addRoom:", error);
    return {
      status: 500,
      message: error.message || "Server error while adding room",
    };
  }
};

export const confirmRoomAssignment = async (data) => {
  const { userId, roomId, userType } = data;
  console.log("rooooooooooooooooooomm");
  console.log(data);

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

// export const handleRemoveAssignment = async (data) => {
//   const { userId, roomId } = data;
//   console.log(data);
//   let session; // Declare session here
//   try {
//     session = await mongoose.startSession(); // Assign it here
//     session.startTransaction();

//     const room = await Room.findById(roomId).session(session);
//     console.log(room);
//     if (!room) {
//       await session.abortTransaction();
//       return {
//         status: 404,
//         body: { error: "Room not found" },
//       };
//     }

//     // Remove occupant from room
//     room.occupant -= 1;
//     room.vacantSlot += 1;
//     room.roomOccupants = room.roomOccupants.filter(
//       (occ) => !occ.userId.equals(userId)
//     );

//     await room.save({ session });

//     await Property.findByIdAndUpdate(
//       room.propertyId,
//       { $inc: { occupiedBeds: -1 } },
//       { session }
//     );

//     await session.commitTransaction();
//     return {
//       status: 200,
//       body: { success: true },
//     };
//   } catch (error) {
//     if (session) {
//       await session.abortTransaction();
//     }
//     console.error("Error removing room assignment:", error);
//     return {
//       status: 500,
//       body: { error: "Failed to remove room assignment" },
//     };
//   } finally {
//     if (session) {
//       session.endSession(); // Clean up
//     }
//   }
// };
export const handleRemoveAssignment = async (data) => {
  const { userId, roomId } = data;
  console.log(data);
  let session;
  try {
    session = await mongoose.startSession();
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

    // 1. CHECK: Is the user actually in this room?
    const existingOccupantIndex = room.roomOccupants.findIndex((occ) =>
      occ.userId.equals(userId)
    );

    if (existingOccupantIndex === -1) {
      // User is not in this room, do not decrement counts!
      await session.abortTransaction();
      return {
        status: 400,
        body: { error: "User is not assigned to this room." },
      };
    }

    // 2. Remove the user specifically
    room.roomOccupants.splice(existingOccupantIndex, 1);

    // 3. Safe Math for Room Counts
    room.occupant = Math.max(0, room.occupant - 1); // Prevent negative
    room.vacantSlot += 1;

    await room.save({ session });

    // 4. Safe Update for Property Counts
    // We use a query filter to ensure we don't decrement if it's already 0
    // OR we rely on the fact that we confirmed the user existed above.
    // Ideally, if a user existed, occupiedBeds *should* be > 0.
    await Property.findOneAndUpdate(
      { _id: room.propertyId, occupiedBeds: { $gt: 0 } }, // Safety check query
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
      session.endSession();
    }
  }
};

export const updateRoom = async (data) => {
  const {
    id,
    roomNo,
    roomCapacity,
    status,
    revenueGeneration,
    adminName,
    floorId, // ✅ new field
  } = data;

  try {
    // ✅ Find existing room
    const room = await Room.findById(id);
    if (!room) {
      return { status: 404, message: "Room not found" };
    }

    // ✅ Check for duplicate roomNo in the same property
    if (roomNo && roomNo !== room.roomNo) {
      const existingRoom = await Room.findOne({
        propertyId: room.propertyId,
        roomNo,
      });
      if (existingRoom) {
        return {
          status: 409,
          message: "Room number already exists under this property",
        };
      }
      room.roomNo = roomNo;
    }

    // ✅ Fetch property details
    const property = await Property.findById(room.propertyId);
    if (!property) {
      return { status: 404, message: "Property not found" };
    }

    // ✅ Validate sharing type in property’s sharingPrices map
    const sharingTypeKey = `${roomCapacity} Sharing`;
    if (
      roomCapacity &&
      !(
        property.sharingPrices instanceof Map &&
        property.sharingPrices.has(sharingTypeKey)
      )
    ) {
      return {
        status: 400,
        message: `${sharingTypeKey} is not defined in this property's sharing prices.`,
      };
    }

    // ✅ Prevent capacity lower than current occupants
    if (roomCapacity && roomCapacity < room.occupant) {
      return {
        status: 400,
        message: `Room capacity cannot be less than current occupants (${room.occupant})`,
      };
    }

    // ✅ Update main fields
    if (roomCapacity) {
      room.roomCapacity = roomCapacity;
      room.sharingType = sharingTypeKey;
      room.vacantSlot = roomCapacity - room.occupant;
    }

    if (status) room.status = status;
    if (revenueGeneration !== undefined)
      room.revenueGeneration = revenueGeneration;
    if (floorId) room.floorId = floorId; // ✅ set new floor
    room.adminName = adminName || room.adminName;

    // ✅ Save changes
    const updatedRoom = await room.save();

    if (floorId) {
      // Find the previous floor (if room was already on a floor)
      const oldFloorId = room.floorId?.toString();
      const newFloorId = floorId.toString();

      // If room moved to another floor → remove from old floor
      if (oldFloorId && oldFloorId !== newFloorId) {
        await Floor.findByIdAndUpdate(oldFloorId, {
          $pull: { roomIds: room._id },
        });
      }

      // Add to new floor (avoid duplicates)
      await Floor.findByIdAndUpdate(
        newFloorId,
        { $addToSet: { roomIds: room._id } } // prevents duplicates
      );
    }

    // ✅ Log update action
    try {
      await PropertyLog.create({
        propertyId: room.propertyId,
        action: "update",
        category: "room",
        changedByName: adminName,
        message: `Room ${room.roomNo} updated by ${adminName}`,
      });
    } catch (logError) {
      console.error("Failed to save property log (updateRoom):", logError);
    }

    return {
      status: 200,
      data: updatedRoom,
    };
  } catch (error) {
    console.error("❌ Error in updateRoom service:", error);
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

export const getRoomsByFloorId = async (data) => {
  const { floorId } = data;

  if (!floorId) {
    return {
      success: false,
      status: 400,
      message: "Floor ID is required",
    };
  }

  try {
    // ✅ Check if floor exists
    const floor = await Floor.findById(floorId).populate(
      "propertyId",
      "propertyName propertyId"
    );
    if (!floor) {
      return {
        success: false,
        status: 404,
        message: "Floor not found",
      };
    }

    // ✅ Fetch rooms belonging to this floor
    const rooms = await Room.find({ floorId })
      .populate("propertyId", "propertyName propertyId")
      .sort({ roomNo: 1 }); // Sort by room number

    if (!rooms || rooms.length === 0) {
      return {
        success: true,
        status: 200,
        message: "No rooms found for this floor",
        data: [],
      };
    }

    return {
      success: true,
      status: 200,
      message: "Rooms fetched successfully",
      data: rooms,
    };
  } catch (error) {
    console.error("❌ Error in getRoomsByFloorId:", error);
    return {
      success: false,
      status: 500,
      message: "Server error while fetching rooms by floor ID",
      error: error.message,
    };
  }
};
