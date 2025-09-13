import mongoose from "mongoose";
import Property from "../models/property.model.js";
import Room from "../models/room.model.js";
import {fetchUserData} from "../services/getOccupantsData.service.js";
import PropertyLog from "../models/propertyLog.model.js";

export const addRoom = async (req, res) => {
  try {
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
    } = req.body;

    // Validate required fields
    if (
      !propertyId ||
      !roomNo ||
      !roomCapacity ||
      !propertyName ||
      !sharingType
    ) {
      return res.status(400).json({message: "Missing required fields"});
    }

    // Fetch property
    const property = await Property.findById(propertyId);
    if (!property) {
      return res.status(404).json({message: "Property not found"});
    }
    console.log(sharingType);
    console.log(property.sharingPrices);
    // Check if sharingType exists in property's sharingPrices
    if (
      !(
        property.sharingPrices instanceof Map &&
        property.sharingPrices.has(sharingType)
      )
    ) {
      return res.status(400).json({
        message: `${sharingType} is not defined in this property's sharing prices.`,
      });
    }

    // Check if room already exists
    const existingRoom = await Room.findOne({propertyId, roomNo});
    if (existingRoom) {
      return res
        .status(409)
        .json({message: "Room number already exists under this property"});
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

      const savedRoom = await newRoom.save({session});

      const updatedProperty = await Property.findByIdAndUpdate(
        propertyId,
        {$inc: {totalBeds: roomCapacity}},
        {new: true, session}
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

      res.status(201).json({
        message: "Room added successfully",
        data: {
          room: savedRoom,
          updatedPropertyStats: {
            totalBeds: updatedProperty.totalBeds,
          },
        },
      });
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  } catch (error) {
    console.error("Error adding room:", error);
    res.status(500).json({
      message: error.message || "Server error while adding room",
    });
  }
};

export const getRoomsByPropertyId = async (req, res) => {
  try {
    const {propertyId} = req.params;

    const rooms = await Room.find({propertyId});

    if (!rooms || rooms.length === 0) {
      return res
        .status(404)
        .json({message: "No rooms found for this property"});
    }

    res.status(200).json({data: rooms});
  } catch (error) {
    console.error("Error fetching rooms:", error);
    res.status(500).json({message: "Server error while fetching rooms"});
  }
};

export const getAvailableRoomsByProperty = async (req, res) => {
  try {
    const {propertyId} = req.query;

    if (!propertyId) {
      return res.status(400).json({message: "propertyId is required"});
    }

    const roomFilter = {
      propertyId,
      status: "available",
      vacantSlot: {$ne: 0},
    };

    const rooms = await Room.find(roomFilter);

    const property = await Property.findById(propertyId).select(
      "sharingPrices deposit"
    );

    if (!property) {
      return res.status(404).json({message: "Property not found"});
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
      .json({message: "Server error while fetching rooms and property"});
  }
};

export const updateRoom = async (req, res) => {
  try {
    const {id} = req.params;
    const {roomNo, roomCapacity, status, adminName} = req.body;

    const room = await Room.findById(id);
    if (!room) {
      return res.status(404).json({message: "Room not found"});
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
      return res.status(404).json({message: "Property not found"});
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
    res.status(500).json({message: "Server error while updating room"});
  }
};

// Get all rooms
export const getAllHeavensRooms = async (req, res) => {
  try {
    const query = {isHeavens: true};

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
    const {id} = req.params;
    const {adminName} = req.query;
    console.log(adminName);
    const deletedRoom = await Room.findByIdAndDelete(id);

    if (!deletedRoom) {
      return res.status(404).json({message: "Room not found"});
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

    res.status(200).json({message: "Room deleted successfully"});
  } catch (error) {
    console.error("Error deleting room:", error);
    res.status(500).json({message: "Server error while deleting room"});
  }
};

export const getRoomOccupants = async (req, res) => {
  try {
    const {roomId} = req.params;
    // console.log("roomId:", roomId);

    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({message: "Room not found"});
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
      .json({message: "Internal server error while fetching occupants"});
  }
};
