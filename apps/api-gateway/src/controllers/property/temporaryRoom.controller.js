import { sendRPCRequest } from "../../../../../libs/common/rabbitMq.js";
import { PROPERTY_PATTERN } from "../../../../../libs/patterns/property/property.pattern.js";

export const addTemporaryRoom = async (req, res) => {
  try {
    const { roomNo, roomCapacity, sharingType, status, description, propertyId } = req.body;

    if (!roomNo || !roomCapacity || !propertyId) {
      return res.status(400).json({
        success: false,
        message: "Room number, capacity, and property ID are required.",
      });
    }

    const response = await sendRPCRequest(PROPERTY_PATTERN.TEMPORARY_ROOM.CREATE, {
      roomNo,
      roomCapacity,
      sharingType,
      status: status || "available",
      description,
      propertyId,
    });

    if (response.status === 200) {
      return res.status(200).json(response.data);
    } else {
      return res
        .status(response.status)
        .json({ message: response.message || "Failed to create temporary room" });
    }
  } catch (error) {
    console.error("❌ Error in addTemporaryRoom gateway controller:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while creating temporary room",
      error: error.message,
    });
  }
};

export const updateTemporaryRoom = async (req, res) => {
  try {
    const { id } = req.params;
    const { roomNo, roomCapacity, sharingType, status, description, roomOccupants } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Room ID is required for update.",
      });
    }

    const response = await sendRPCRequest(PROPERTY_PATTERN.TEMPORARY_ROOM.UPDATE, {
      id,
      roomNo,
      roomCapacity,
      sharingType,
      status,
      description,
      roomOccupants,
    });

    if (response.status === 200) {
      return res.status(200).json(response.data);
    } else {
      return res
        .status(response.status)
        .json({ message: response.message || "Failed to update temporary room" });
    }
  } catch (error) {
    console.error("❌ Error in updateTemporaryRoom gateway controller:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while updating temporary room",
      error: error.message,
    });
  }
};

export const deleteTemporaryRoom = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Room ID is required for deletion.",
      });
    }

    const response = await sendRPCRequest(PROPERTY_PATTERN.TEMPORARY_ROOM.DELETE, {
      id,
    });

    if (response.status === 200) {
      return res.status(200).json({ message: response.message, data: response.data });
    } else {
      return res
        .status(response.status)
        .json({ message: response.message || "Failed to delete temporary room" });
    }
  } catch (error) {
    console.error("❌ Error in deleteTemporaryRoom gateway controller:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while deleting temporary room",
      error: error.message,
    });
  }
};

export const getAllTemporaryRooms = async (req, res) => {
  try {
    const { propertyId } = req.query;

    const response = await sendRPCRequest(PROPERTY_PATTERN.TEMPORARY_ROOM.GET_ALL, {
      propertyId,
    });

    if (response.status === 200) {
      return res.status(200).json(response.data);
    } else {
      return res
        .status(response.status)
        .json({ message: response.message || "Failed to fetch temporary rooms" });
    }
  } catch (error) {
    console.error("❌ Error in getAllTemporaryRooms gateway controller:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching temporary rooms",
      error: error.message,
    });
  }
};

export const getTemporaryRoomById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Room ID is required.",
      });
    }

    const response = await sendRPCRequest(PROPERTY_PATTERN.TEMPORARY_ROOM.GET_BY_ID, {
      id,
    });

    if (response.status === 200) {
      return res.status(200).json(response.data);
    } else {
      return res
        .status(response.status)
        .json({ message: response.message || "Failed to fetch temporary room details" });
    }
  } catch (error) {
    console.error("❌ Error in getTemporaryRoomById gateway controller:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching temporary room details",
      error: error.message,
    });
  }
};
