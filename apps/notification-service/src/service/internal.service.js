import { sendRPCRequest } from "../../../../libs/common/rabbitMq.js";
import { USER_PATTERN } from "../../../../libs/patterns/user/user.pattern.js";

export const getUserIds = async (messOnly, studentOnly, dailyRentOnly, workerOnly) => {
    
    return sendRPCRequest(USER_PATTERN.USER.GET_USER_IDS, {
        messOnly, 
        studentOnly, 
        dailyRentOnly,
        workerOnly,   
    });
  };  