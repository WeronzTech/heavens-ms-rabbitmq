import { sendRPCRequest } from "../../../../../libs/common/rabbitMq.js";
import { PROPERTY_PATTERN } from "../../../../../libs/patterns/property/property.pattern.js";


export const addRoom = async (req, res) => {
  try {
    const {
      roomNo,
      sharingType,
      roomCapacity,
      occupant,
      vacantSlot,
      status,
      description,
      propertyId,
      propertyName,
      floorId,
      adminName,
      isHeavens,
    } = req.body;

    // Basic validation
    if (!roomNo || !sharingType || !roomCapacity || !status || !propertyId) {
      return res.status(400).json({
        success: false,
        message: "Required fields are missing.",
      });
    }

    const response = await sendRPCRequest(PROPERTY_PATTERN.ROOM.CREATE_ROOM, {
      roomNo,
      sharingType,
      roomCapacity,
      occupant: occupant || 0,
      vacantSlot: vacantSlot ?? roomCapacity, // default vacantSlot = roomCapacity if not passed
      status,
      description,
      propertyId,
      propertyName,
      floorId,
      adminName,
      isHeavens,
    });

    console.log("✅ Room Create Response:", response);

    if (response.status === 200) {
      return res.status(200).json(response.data);
    } else {
      return res
        .status(response.status)
        .json({ message: response.message || "Failed to create room" });
    }
  } catch (error) {
    console.error("❌ Error in addRoom controller:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while creating room",
      error: error.message,
    });
  }
};

export const updateRoom = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      roomNo,
      sharingType,
      roomCapacity,
      occupant,
      vacantSlot,
      status,
      description,
      adminName,
    } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Room ID is required for update.",
      });
    }

    const response = await sendRPCRequest(PROPERTY_PATTERN.ROOM.UPDATE_ROOM, {
      id,
      roomNo,
      sharingType,
      roomCapacity,
      occupant,
      vacantSlot,
      status,
      description,
      adminName,
    });

    console.log("🔄 Update Room Response:", response);

    if (response.status === 200) {
      return res.status(200).json(response.data);
    } else {
      return res
        .status(response.status)
        .json({ message: response.message || "Failed to update room" });
    }
  } catch (error) {
    console.error("❌ Error in updateRoom controller:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while updating room",
      error: error.message,
    });
  }
};
  export const deleteRoom = async (req, res) => {
    try {
      const { id } = req.params;
      const { adminName } = req.query;
  
      const response = await sendRPCRequest(PROPERTY_PATTERN.ROOM.DELETE_ROOM, {
        id,
        adminName,
      });
  
      if (response.status === 200) {
        return res.status(200).json({ message: response.message });
      } else {
        return res.status(response?.status).json({ message: response.message });
      }
    } catch (error) {
      console.error("Error in deleteRoom controller:", error);
      return res.status(500).json({
        message: error.message || "Server error while deleting room",
      });
    }
  };

  export const getRoomsByPropertyId = async (req, res) => {
    try {
      const { propertyId } = req.params;
  
      const response = await sendRPCRequest(PROPERTY_PATTERN.ROOM.GET_ROOMS_BY_PROPERTYID, {
        propertyId,
      });
  
      console.log("📦 Get Rooms Response:", response);
  
      if (response.status === 200) {
        return res.status(200).json(response.data);
      } else {
        return res
          .status(response.status)
          .json({ message: response.message || "Failed to fetch rooms" });
      }
    } catch (error) {
      console.error("❌ Error in getRoomsByPropertyId controller:", error);
      return res.status(500).json({ message: "Server error while fetching rooms" });
    }
  };

  export const getRoomOccupants = async (req, res) => {
    try {
      const { roomId } = req.params;
  
      const response = await sendRPCRequest(
        PROPERTY_PATTERN.ROOM.GET_ROOM_OCCUPANTS,
        { roomId }
      );
  
      console.log("👥 Get Room Occupants Response:", response);
  
      if (response.status === 200) {
        return res.status(200).json(response.data);
      } else {
        return res
          .status(response.status)
          .json({ message: response.message || "Failed to fetch room occupants" });
      }
    } catch (error) {
      console.error("❌ Error in getRoomOccupants controller:", error);
      return res.status(500).json({
        message: error.message || "Server error while fetching room occupants",
      });
    }
  };

  export const getAvailableRoomsByProperty = async (req, res) => {
    try {
      const { propertyId } = req.query;
  
      if (!propertyId) {
        return res.status(400).json({ message: "propertyId is required" });
      }
  
      const response = await sendRPCRequest(
        PROPERTY_PATTERN.ROOM.GET_AVAILABLE_ROOMS_BY_PROPERTY,
        { propertyId }
      );
  
      console.log("🏠 Get Available Rooms RPC Response:", response);
  
      if (response.status === 200) {
        return res.status(200).json(response.data);
      } else {
        return res
          .status(response.status)
          .json({ message: response.message || "Failed to fetch available rooms" });
      }
    } catch (error) {
      console.error("❌ Error in getAvailableRoomsByProperty controller:", error);
      return res.status(500).json({
        message: error.message || "Server error while fetching available rooms",
      });
    }
  };
  export const getAllHeavensRooms = async (req, res) => {
    try {
      const { propertyId } = req.query;
  
      const response = await sendRPCRequest(
        PROPERTY_PATTERN.ROOM.GET_ALL_HEAVENS_ROOMS,
        { propertyId }
      );
  
      console.log("✨ Get All Heavens Rooms RPC Response:", response);
  
      if (response.status === 200) {
        return res.status(200).json(response.data);
      } else {
        return res
          .status(response.status)
          .json({ message: response.message || "Failed to fetch Heavens rooms" });
      }
    } catch (error) {
      console.error("❌ Error in getAllHeavensRooms controller:", error);
      return res.status(500).json({
        message: error.message || "Server error while fetching Heavens rooms",
      });
    }
  };
  
  export const getRoomsByFloorId = async (req, res) => {
    try {
      const { floorId } = req.query;
  
      if (!floorId) {
        return res.status(400).json({ message: "floorId is required" });
      }
  
      const response = await sendRPCRequest(
        PROPERTY_PATTERN.ROOM.GET_ROOMS_BY_FLOOR_ID,
        { floorId }
      );
  
      console.log("✨ Get Rooms by Floor ID RPC Response:", response);
  
      if (response.status === 200) {
        return res.status(200).json(response.data);
      } else {
        return res
          .status(response.status)
          .json({
            message: response.message || "Failed to fetch rooms by floor ID",
          });
      }
    } catch (error) {
      console.error("❌ Error in getRoomsByFloorId controller:", error);
      return res.status(500).json({
        message: error.message || "Server error while fetching rooms by floor ID",
      });
    }
  };
  