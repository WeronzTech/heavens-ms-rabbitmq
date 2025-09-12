import axios from "axios";

export const handleRoomChange = async (user, newRoomId, newPropertyId) => {
  try {
    const currentRoomId = user.stayDetails?.roomId;
    const currentPropertyId = user.stayDetails?.propertyId;

    // If room is being changed
    if (newRoomId && currentRoomId?.toString() !== newRoomId.toString()) {
      const userId = user._id;
      const roomId = newRoomId;
      const userType =
        user.rentType === "monthly" ? "longTermResident" : "dailyRenter";

      console.log("Akllll");
      console.log(userId, roomId, userType);
      console.log("Nikhillllllll");

      // Add to new room
      await assignToRoom({ userId, roomId, userType });

      // Remove from old room if exists
      // if (currentRoomId) {
      //   await removeFromRoom(user._id, currentRoomId);
      // }
    }

    // If property is being changed (without room change)
    if (newPropertyId && currentPropertyId !== newPropertyId && !newRoomId) {
      console.log("hererere reachedddd"); // Update property counts through API
      await updatePropertyCounts(currentPropertyId, newPropertyId);
    }
  } catch (error) {
    console.error("Room/property update error:", error);
    throw error;
  }
};

export const assignToRoom = async ({ userId, roomId, userType }) => {
  console.log("Herere first");
  console.log({ userId, roomId, userType });
  console.log("Herere second");

  try {
    const response = await axios.post(
      `${process.env.PROPERTY_SERVICE_URL}/property/internal/confirm-room-assignment`,
      {
        userId,
        roomId,
        userType,
      },
      {
        headers: {
          "x-internal-key": process.env.INTERNAL_SECRET_KEY,
        },
      }
    );
    return response.data;
  } catch (error) {
    if (error.response) {
      const err = new Error(
        error.response.data.error || "Failed to assign to room"
      );
      err.status = error.response.status;
      throw err;
    }
    throw new Error("Property service unavailable");
  }
};

export const removeFromRoom = async (userId, roomId) => {
  try {
    await axios.post(
      `${process.env.PROPERTY_SERVICE_URL}/property/internal/remove-room-assignment`,
      {
        userId,
        roomId,
      },
      {
        headers: {
          "x-internal-key": process.env.INTERNAL_SECRET_KEY,
        },
      }
    );
  } catch (error) {
    if (error.response) {
      const err = new Error(
        error.response.data.error || "Failed to remove from room"
      );
      err.status = error.response.status;
      throw err;
    }
    throw new Error("Property service unavailable");
  }
};

export const updatePropertyCounts = async (oldPropertyId, newPropertyId) => {
  try {
    await axios.post(
      `${process.env.PROPERTY_SERVICE_URL}/property/internal/update-property-counts`,
      {
        oldPropertyId,
        newPropertyId,
        action: "transfer",
      },
      {
        headers: {
          "x-internal-key": process.env.INTERNAL_SECRET_KEY,
        },
      }
    );
  } catch (error) {
    if (error.response) {
      const err = new Error(
        error.response.data.error || "Failed to update property counts"
      );
      err.status = error.response.status;
      throw err;
    }
    throw new Error("Property service unavailable");
  }
};

export const assignRoomToUser = async ({ userId, roomId, userType }) => {
  return assignToRoom({ userId, roomId, userType });
};

export const assignRoomToDailyRent = async (occupantId, roomId, userType) => {
  return assignToRoom(occupantId, roomId, userType);
};
