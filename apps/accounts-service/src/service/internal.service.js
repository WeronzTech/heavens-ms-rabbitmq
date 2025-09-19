import { sendRPCRequest } from "../../../../libs/common/rabbitMq.js";
import { PROPERTY_PATTERN } from "../../../../libs/patterns/property/property.pattern.js";
import { USER_PATTERN } from "../../../../libs/patterns/user/user.pattern.js";

export const getUserById = async (userId) => {
    return sendRPCRequest(USER_PATTERN.USER.GET_USER_BY_ID, {
        userId,
    });
  }

  export const getPropertyById = async(propertyId) => {
    return sendRPCRequest(PROPERTY_PATTERN.PROPERTY.GET_PROPERTY_BY_ID, {
      propertyId,
    });
  }  