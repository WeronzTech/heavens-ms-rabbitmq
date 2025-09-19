import { sendRPCRequest } from "../../../../libs/common/rabbitMq.js";
import { AUTH_PATTERN } from "../../../../libs/patterns/auth/auth.pattern.js";
import { INVENTORY_PATTERN } from "../../../../libs/patterns/inventory/inventory.pattern.js";
import { USER_PATTERN } from "../../../../libs/patterns/user/user.pattern.js";

export const fetchUserData = async (roomId) => {
  return sendRPCRequest(USER_PATTERN.USER.FETCH_USER_DATA, {
    roomId,
  });
};

export const getAccessibleKitchens = async (propertyId) => {
    return sendRPCRequest(INVENTORY_PATTERN.INTERNAL.GET_ACCESSIBLE_KITCHENS, {
     propertyId,   
    });
  };
  
export const getRoleName = async (roleId) => {
    return sendRPCRequest(AUTH_PATTERN.ROLE.GET_ROLE_NAME, {
      roleId,   
    });
  };  