import { sendRPCRequest } from "../../../../libs/common/rabbitMq.js";
import { INVENTORY_PATTERN } from "../../../../libs/patterns/inventory/inventory.pattern.js";
import { PROPERTY_PATTERN } from "../../../../libs/patterns/property/property.pattern.js";

export const assignRoomToUser = async ({ userId, roomId, userType }) => {
  return sendRPCRequest(PROPERTY_PATTERN.ROOM.CONFIRM_ASSIGNMENT, {
    userId,
    roomId,
    userType,
  });
};

export const removeFromRoom = async ({ userId, roomId }) => {
  return sendRPCRequest(PROPERTY_PATTERN.ROOM.REMOVE_ASSIGNMENT, {
    userId,
    roomId,
  });
};

export const getAccessibleKitchens = async ({ propertyId }) => {
  return sendRPCRequest(INVENTORY_PATTERN.INTERNAL.GET_ACCESSIBLE_KITCHENS, {
    propertyId,
  });
};

export const updatePropertyCounts = async ({
  oldPropertyId,
  newPropertyId,
}) => {
  return sendRPCRequest(PROPERTY_PATTERN.INTERNAL.UPDATE_PROPERTY_COUNTS, {
    oldPropertyId,
    newPropertyId,
  });
};
