import {sendRPCRequest} from "../../../../../libs/common/rabbitMq.js";
import {USER_PATTERN} from "../../../../../libs/patterns/user/user.pattern.js";

const handleRPCAndRespond = async (res, pattern, data) => {
  try {
    const response = await sendRPCRequest(pattern, data);
    return res.status(response.status || 500).json(response);
  } catch (error) {
    console.error(`API Gateway Error in pattern ${pattern}:`, error);
    return res
      .status(500)
      .json({message: "Internal Server Error in API Gateway."});
  }
};

export const createAppSettings = (req, res) => {
  return handleRPCAndRespond(
    res,
    USER_PATTERN.SETTINGS.CREATE_APP_SETTINGS,
    req.body,
  );
};

export const getAppSettings = (req, res) => {
  const userId = req.userAuth;
  if (!userId) {
    return res.status(401).json({message: "User not authenticated."});
  }
  return handleRPCAndRespond(res, USER_PATTERN.SETTINGS.GET_APP_SETTINGS, {
    userId,
  });
};

export const getAppSettingsAdmin = (req, res) => {
  return handleRPCAndRespond(
    res,
    USER_PATTERN.SETTINGS.GET_APP_SETTINGS_ADMIN,
    {},
  );
};

export const updateAppSettings = (req, res) => {
  return handleRPCAndRespond(
    res,
    USER_PATTERN.SETTINGS.UPDATE_APP_SETTINGS,
    req.body,
  );
};
