import mongoose from "mongoose";
import { sendRPCRequest } from "../../../../libs/common/rabbitMq.js";
import { AUTH_PATTERN } from "../../../../libs/patterns/auth/auth.pattern.js";
import { USER_PATTERN } from "../../../../libs/patterns/user/user.pattern.js";
import Property from "../models/property.model.js";

export const fetchUserData = async (roomId) => {
  return sendRPCRequest(USER_PATTERN.USER.FETCH_USER_DATA, {
    roomId,
  });
};

export const getRoleName = async (roleId) => {
  console.log(roleId);
  return sendRPCRequest(AUTH_PATTERN.ROLE.GET_ROLE_NAME, {
    roleId,
  });
};

export const updatePropertyCounts = async (data) => {
  const { oldPropertyId, newPropertyId, action } = data;
  try {
    const session = await mongoose.startSession();
    session.startTransaction();

    if (action === "transfer") {
      // Decrement old property
      await Property.findByIdAndUpdate(
        oldPropertyId,
        { $inc: { occupiedBeds: -1 } },
        { session }
      );

      // Increment new property
      await Property.findByIdAndUpdate(
        newPropertyId,
        { $inc: { occupiedBeds: 1 } },
        { session }
      );
    }
    // Add other actions if needed

    await session.commitTransaction();
    return { status: 200, body: { success: true } };
  } catch (error) {
    await session?.abortTransaction();
    console.error("Error updating property counts:", error);
    return { status: 500, body: { error: "Failed to update property counts" } };
  } finally {
    await session?.endSession();
  }
};
