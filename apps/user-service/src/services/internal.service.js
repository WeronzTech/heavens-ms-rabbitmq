import { sendRPCRequest } from "../../../../libs/common/rabbitMq.js";
import { PROPERTY_PATTERN } from "../../../../libs/patterns/property/property.pattern.js";

export const assignRoomToUser = async ({ userId, roomId, userType }) => {
  return sendRPCRequest(PROPERTY_PATTERN.ROOM.CONFIRM_ASSIGNMENT, {
    userId,
    roomId,
    userType,
  });
};
