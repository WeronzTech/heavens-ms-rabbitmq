import { sendRPCRequest } from "../../../../../libs/common/rabbitMq.js";
import { USER_PATTERN } from "../../../../../libs/patterns/user/user.pattern.js";

const handleRPCAndRespond = async (res, pattern, data) => {
  try {
    const response = await sendRPCRequest(pattern, data);
    return res.status(response.status || 500).json(response);
  } catch (error) {
    console.error(`API Gateway Error in ${pattern}:`, error);
    return res
      .status(500)
      .json({ message: "Internal Server Error in API Gateway." });
  }
};

export const getUserReferralDetails = (req, res) => {
  const userId = req.userAuth;
  if (!userId) {
    return res.status(401).json({ message: "User not authenticated." });
  }
  return handleRPCAndRespond(
    res,
    USER_PATTERN.REFERRAL.GET_USER_REFERRAL_DETAILS,
    { userId }
  );
};

export const getReferralSettings = (req, res) => {
  return handleRPCAndRespond(res, USER_PATTERN.REFERRAL.GET_SETTINGS, {});
};

export const updateReferralSettings = (req, res) => {
  return handleRPCAndRespond(
    res,
    USER_PATTERN.REFERRAL.UPDATE_SETTINGS,
    req.body
  );
};
