import EventPermission from "../models/eventPermission.model.js";
import { AUTH_PATTERN } from "../../../../libs/patterns/auth/auth.pattern.js";
import { sendRPCRequest } from "../../../../libs/common/rabbitMq.js";

// This helper function would be in your auth service, but we replicate it here for context
const getRoleName = async (roleId) => {
  if (!roleId) return "N/A";
  try {
    const roleResponse = await sendRPCRequest(
      AUTH_PATTERN.ROLE.GET_ROLE_BY_ID,
      {
        roleId,
      }
    );
    return roleResponse.data?.roleName || "N/A";
  } catch (error) {
    console.error(`Failed to fetch role for roleId ${roleId}:`, error.message);
    return "N/A";
  }
};

// This function needs access to your socket.io instance and user store
export const emitToUsers = (data, io, findSocketIdByUserId) => {
  const { userIds, event, data: eventData } = data;

  if (!userIds || !event || !eventData) {
    return {
      success: false,
      status: 400,
      message: "Missing userIds, event, or data",
    };
  }

  let successCount = 0;
  let failureCount = 0;

  userIds.forEach(async (userId) => {
    const recipientSocketId = await findSocketIdByUserId(userId);
    if (recipientSocketId) {
      console.log("recipientSocketId", recipientSocketId);
      io.to(recipientSocketId).emit(event, eventData);
      successCount++;
    } else {
      console.log(`Could not emit event: User '${userId}' is not connected.`);
      failureCount++;
    }
  });

  if (successCount > 0) {
    return {
      success: true,
      status: 200,
      message: `Event emitted to ${successCount} user(s). ${failureCount} user(s) not connected.`,
    };
  } else {
    return {
      success: false,
      status: 404,
      message: "No connected users found to emit the event to.",
    };
  }
};

export const createEventPermission = async (data) => {
  try {
    const { eventName, userRoles } = data;
    if (!eventName) {
      return {
        success: false,
        status: 400,
        message: "Event name is required.",
      };
    }

    const existingEvent = await EventPermission.findOne({ eventName });
    if (existingEvent) {
      return {
        success: false,
        status: 409,
        message: "An event with this name already exists.",
      };
    }

    const newEventPermission = await EventPermission.create({
      eventName,
      userRoles,
    });
    return {
      success: true,
      status: 201,
      message: "Event permission created successfully.",
      data: newEventPermission,
    };
  } catch (error) {
    return { success: false, status: 500, message: error.message };
  }
};

export const getAllEventPermissions = async (query) => {
  try {
    const eventPermissions = await EventPermission.find(query).lean();
    const enrichedEvents = await Promise.all(
      eventPermissions.map(async (event) => {
        if (!event.userRoles || event.userRoles.length === 0) return event;
        const enrichedUserRoles = await Promise.all(
          event.userRoles.map(async (roleId) => ({
            _id: roleId,
            roleName: await getRoleName(roleId),
          }))
        );
        return { ...event, userRoles: enrichedUserRoles };
      })
    );
    return {
      success: true,
      status: 200,
      message: "Event permissions fetched successfully.",
      data: enrichedEvents,
    };
  } catch (error) {
    return { success: false, status: 500, message: error.message };
  }
};

export const getEventPermissionById = async ({ id }) => {
  try {
    const eventPermission = await EventPermission.findById(id);
    if (!eventPermission) {
      return {
        success: false,
        status: 404,
        message: "Event permission not found.",
      };
    }
    return {
      success: true,
      status: 200,
      message: "Event permission fetched successfully.",
      data: eventPermission,
    };
  } catch (error) {
    return { success: false, status: 500, message: error.message };
  }
};

export const updateEventPermission = async ({ id, eventName, userRoles }) => {
  try {
    const updatedEvent = await EventPermission.findByIdAndUpdate(
      id,
      { eventName, userRoles },
      { new: true, runValidators: true }
    );
    if (!updatedEvent) {
      return {
        success: false,
        status: 404,
        message: "Event permission not found.",
      };
    }
    return {
      success: true,
      status: 200,
      message: "Event permission updated successfully.",
      data: updatedEvent,
    };
  } catch (error) {
    return { success: false, status: 500, message: error.message };
  }
};

export const deleteEventPermission = async ({ id }) => {
  try {
    const deletedEvent = await EventPermission.findByIdAndDelete(id);
    if (!deletedEvent) {
      return {
        success: false,
        status: 404,
        message: "Event permission not found.",
      };
    }
    return {
      success: true,
      status: 200, // Using 200 instead of 204 to send a body
      message: "Event permission deleted successfully.",
    };
  } catch (error) {
    return { success: false, status: 500, message: error.message };
  }
};
