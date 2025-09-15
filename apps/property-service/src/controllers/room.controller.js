import Property from "../models/property.model.js";
import Room from "../models/room.model.js";
import { fetchUserData } from "../services/getOccupantsData.service.js";
import PropertyLog from "../models/propertyLog.model.js";
import { PROPERTY_PATTERN } from "../../../../libs/patterns/property/property.pattern.js";
import { addRoom, confirmRoomAssignment } from "../services/room.service.js";
import { createResponder } from "../../../../libs/common/rabbitMq.js";

createResponder(PROPERTY_PATTERN.ROOM.CREATE_ROOM, async (data) => {
  return await addRoom(data);
});

// createResponder(PROPERTY_PATTERN.ROOM.CONFIRM_ASSIGNMENT, async (data) => {
//   console.log("dataatatat");
//   return await confirmRoomAssignment(data);
// });

createResponder(PROPERTY_PATTERN.ROOM.CONFIRM_ASSIGNMENT, async (data) => {
  console.log("[Property Service] Received RPC request:", data);
  return await confirmRoomAssignment(data);
});

export const getRoomsByPropertyId = async (req, res) => {
  try {
    const { propertyId } = req.params;

    const rooms = await Room.find({ propertyId });

    if (!rooms || rooms.length === 0) {
      return res
        .status(404)
        .json({ message: "No rooms found for this property" });
    }

    res.status(200).json({ data: rooms });
  } catch (error) {
    console.error("Error fetching rooms:", error);
    res.status(500).json({ message: "Server error while fetching rooms" });
  }
};

export const getAvailableRoomsByProperty = async (req, res) => {
  try {
    const { propertyId } = req.query;

    if (!propertyId) {
      return res.status(400).json({ message: "propertyId is required" });
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
      return res.status(404).json({ message: "Property not found" });
    }

    if (!rooms.length) {
      return res.status(404).json({
        message: "No available rooms with vacant slots found for this property",
      });
    }

    res.status(200).json({
      data: rooms,
      pricing: {
        sharingPrices: property.sharingPrices,
        deposit: property.deposit,
      },
    });
  } catch (error) {
    console.error("Error fetching rooms and property data:", error);
    res
      .status(500)
      .json({ message: "Server error while fetching rooms and property" });
  }
};

export const updateRoom = async (req, res) => {
  try {
    const { id } = req.params;
    const { roomNo, roomCapacity, status, adminName } = req.body;

    const room = await Room.findById(id);
    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    // Check for duplicate roomNo
    if (roomNo && roomNo !== room.roomNo) {
      const existingRoom = await Room.findOne({
        propertyId: room.propertyId,
        roomNo: roomNo,
      });
      if (existingRoom) {
        return res.status(409).json({
          message: "Room number already exists under this property",
        });
      }
      room.roomNo = roomNo;
    }
    // Fetch property
    const property = await Property.findById(room.propertyId);
    if (!property) {
      return res.status(404).json({ message: "Property not found" });
    }

    // Check if sharingType exists in property's sharingPrices
    if (
      !(
        property.sharingPrices instanceof Map &&
        property.sharingPrices.has(`${roomCapacity} Sharing`)
      )
    ) {
      return res.status(400).json({
        message: `${roomCapacity} Sharing is not defined in this property's sharing prices.`,
      });
    }

    // Check and update roomCapacity
    if (roomCapacity && roomCapacity !== room.roomCapacity) {
      if (roomCapacity < room.occupant) {
        return res.status(400).json({
          message: `Room capacity cannot be less than current occupants (${room.occupant})`,
        });
      }
      room.roomCapacity = roomCapacity;
      room.sharingType = `${roomCapacity} sharing`;
      room.vacantSlot = roomCapacity - room.occupant;
    }

    if (status) {
      room.status = status;
    }

    const updatedRoom = await room.save();

    try {
      await PropertyLog.create({
        propertyId: property._id,
        action: "update",
        category: "property",
        changedByName: adminName,
        message: `Room ${updatedRoom.roomNo} updated in property "${property.propertyName}" by ${adminName} (capacity: ${updatedRoom.roomCapacity}, status: ${updatedRoom.status})`,
      });
    } catch (logError) {
      console.error("Failed to save property log (updateRoom):", logError);
    }

    res.status(200).json({
      message: "Room updated successfully",
      data: updatedRoom,
    });
  } catch (error) {
    console.error("Error updating room:", error);
    res.status(500).json({ message: "Server error while updating room" });
  }
};

// Get all rooms
export const getAllHeavensRooms = async (req, res) => {
  try {
    const query = { isHeavens: true };

    if (req.query.propertyId && req.query.propertyId !== "null") {
      query.propertyId = req.query.propertyId;
    }

    const rooms = await Room.find(query);
    res.status(200).json(rooms);
  } catch (error) {
    console.error("Error fetching rooms:", error);
    res.status(500).json({
      message: "Server error while fetching rooms",
      error: error.message,
    });
  }
};

// Delete a room
export const deleteRoom = async (req, res) => {
  try {
    const { id } = req.params;
    const { adminName } = req.query;
    console.log(adminName);
    const deletedRoom = await Room.findByIdAndDelete(id);

    if (!deletedRoom) {
      return res.status(404).json({ message: "Room not found" });
    }

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

    res.status(200).json({ message: "Room deleted successfully" });
  } catch (error) {
    console.error("Error deleting room:", error);
    res.status(500).json({ message: "Server error while deleting room" });
  }
};

export const getRoomOccupants = async (req, res) => {
  try {
    const { roomId } = req.params;
    // console.log("roomId:", roomId);

    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    const occupants = [];

    try {
      const userData = await fetchUserData(roomId); // This returns { occupants: [...] }
      console.log("Fetched user data:", userData);

      // Push each occupant from userData.occupants into your result
      for (const user of userData.occupants) {
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

    res.status(200).json({
      roomId,
      occupantCount: occupants.length,
      occupants,
    });
  } catch (error) {
    console.error("Error in getRoomOccupants:", error);
    res
      .status(500)
      .json({ message: "Internal server error while fetching occupants" });
  }
};
