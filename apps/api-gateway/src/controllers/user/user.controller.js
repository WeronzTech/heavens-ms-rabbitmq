import { sendRPCRequest } from "../../../../../libs/common/rabbitMq.js";
import { USER_PATTERN } from "../../../../../libs/patterns/user/user.pattern.js";

export const registerUser = async (req, res) => {
  const {
    userType,
    name,
    email,
    contact,
    password,
    stayDetails,
    messDetails,
    referralLink,
    isHeavens,
    personalDetails,
  } = req.body;
  console.log("Here");
  const response = await sendRPCRequest(USER_PATTERN.USER.REGISTER_USER, {
    userType,
    name,
    email,
    contact,
    password,
    stayDetails,
    messDetails,
    referralLink,
    isHeavens,
    personalDetails,
  });

  return res.status(response.statusCode).json(response.body);
};

export const getUnapprovedUsers = async (req, res) => {
  const { propertyId } = req.query;
  approveUser;
  const response = await sendRPCRequest(USER_PATTERN.USER.UNAPPROVED_USER, {
    propertyId,
  });

  return res.status(response.status).json(response.body);
};

export const approveUser = async (req, res) => {
  const { id } = req.params;
  const {
    name,
    email,
    contact,
    userType,
    rentType,
    propertyId,
    propertyName,
    roomId,
    refundableDeposit,
    nonRefundableDeposit,
    joinDate,
    messDetails,
    stayDetails,
    monthlyRent,
    kitchenId,
    kitchenName,
    updatedBy,
  } = req.body;
  const response = await sendRPCRequest(USER_PATTERN.USER.APPROVE_USER, {
    id,
    name,
    email,
    contact,
    userType,
    rentType,
    propertyId,
    propertyName,
    roomId,
    refundableDeposit,
    nonRefundableDeposit,
    joinDate,
    messDetails,
    stayDetails,
    monthlyRent,
    kitchenId,
    kitchenName,
    updatedBy,
  });

  return res.status(response.status).json(response.body);
};
