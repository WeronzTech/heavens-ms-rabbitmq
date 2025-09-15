import { sendRPCRequest } from "../../../../libs/common/rabbitMq.js";
import { USER_PATTERN } from "../../../../libs/patterns/user/user.pattern.js";

export const fetchUserData = async (roomId) => {
  return sendRPCRequest(USER_PATTERN.USER.FETCH_USER_DATA, {
    roomId,
  });
};
