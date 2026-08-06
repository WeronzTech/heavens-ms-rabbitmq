import TemporaryRoom from "../models/temporaryRoom.model.js";

export const addTempRoom = async (data) => {
  const { roomNo, roomCapacity, sharingType, status, description, propertyId } = data;

  if (!roomNo || !roomCapacity) {
    return { status: 400, message: "Room number and capacity are required" };
  }

  try {
    const existingRoom = await TemporaryRoom.findOne({ roomNo, propertyId });
    if (existingRoom) {
      return { status: 409, message: "Temporary room number already exists under this property" };
    }

    const newRoom = new TemporaryRoom({
      roomNo,
      propertyId,
      roomCapacity,
      sharingType,
      status: status || "available",
      description,
      roomOccupants: []
    });

    const savedRoom = await newRoom.save();
    return {
      status: 200,
      data: savedRoom
    };
  } catch (error) {
    console.error("❌ Error in addTempRoom service:", error);
    return {
      status: 500,
      message: error.message || "Server error while adding temporary room"
    };
  }
};

export const updateTempRoom = async (data) => {
  const { id, roomNo, roomCapacity, sharingType, status, description, roomOccupants } = data;

  if (!id) {
    return { status: 400, message: "Room ID is required for update" };
  }

  try {
    const room = await TemporaryRoom.findById(id);
    if (!room) {
      return { status: 404, message: "Temporary room not found" };
    }

    if (roomNo && roomNo !== room.roomNo) {
      const existingRoom = await TemporaryRoom.findOne({ roomNo, propertyId: room.propertyId });
      if (existingRoom) {
        return { status: 409, message: "Temporary room number already exists under this property" };
      }
      room.roomNo = roomNo;
    }

    if (roomCapacity !== undefined) {
      // Prevent capacity lower than current occupants
      const currentOccupantCount = roomOccupants ? roomOccupants.length : room.roomOccupants.length;
      if (roomCapacity < currentOccupantCount) {
        return {
          status: 400,
          message: `Room capacity cannot be less than current occupants (${currentOccupantCount})`
        };
      }
      room.roomCapacity = roomCapacity;
    }

    if (sharingType !== undefined) room.sharingType = sharingType;
    if (status !== undefined) room.status = status;
    if (description !== undefined) room.description = description;
    if (roomOccupants !== undefined) {
      // Make sure each occupant has bookingDate parsed as Date if present
      room.roomOccupants = roomOccupants.map(occ => ({
        name: occ.name,
        phoneNumber: occ.phoneNumber,
        bookingDate: occ.bookingDate ? new Date(occ.bookingDate) : new Date()
      }));
    }

    const updatedRoom = await room.save();
    return {
      status: 200,
      data: updatedRoom
    };
  } catch (error) {
    console.error("❌ Error in updateTempRoom service:", error);
    return {
      status: 500,
      message: error.message || "Server error while updating temporary room"
    };
  }
};

export const deleteTempRoom = async (data) => {
  const { id } = data;
  if (!id) {
    return { status: 400, message: "Room ID is required" };
  }

  try {
    const deletedRoom = await TemporaryRoom.findByIdAndDelete(id);
    if (!deletedRoom) {
      return { status: 404, message: "Temporary room not found" };
    }

    return {
      status: 200,
      message: "Temporary room deleted successfully",
      data: deletedRoom
    };
  } catch (error) {
    console.error("❌ Error in deleteTempRoom service:", error);
    return {
      status: 500,
      message: error.message || "Server error while deleting temporary room"
    };
  }
};

export const getAllTempRooms = async (data) => {
  const { propertyId } = data || {};
  try {
    const filter = propertyId ? { propertyId } : {};
    const rooms = await TemporaryRoom.find(filter).sort({ roomNo: 1 });
    return {
      status: 200,
      data: rooms
    };
  } catch (error) {
    console.error("❌ Error in getAllTempRooms service:", error);
    return {
      status: 500,
      message: error.message || "Server error while fetching temporary rooms"
    };
  }
};

export const getTempRoomById = async (data) => {
  const { id } = data;
  if (!id) {
    return { status: 400, message: "Room ID is required" };
  }

  try {
    const room = await TemporaryRoom.findById(id);
    if (!room) {
      return { status: 404, message: "Temporary room not found" };
    }

    return {
      status: 200,
      data: room
    };
  } catch (error) {
    console.error("❌ Error in getTempRoomById service:", error);
    return {
      status: 500,
      message: error.message || "Server error while fetching temporary room details"
    };
  }
};
