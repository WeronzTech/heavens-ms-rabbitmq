import { sendRPCRequest } from "../../../../../libs/common/rabbitMq.js";
import { ACCOUNTS_PATTERN } from "../../../../../libs/patterns/accounts/accounts.pattern.js";

const handleRPCAndRespond = async (res, pattern, data) => {
  try {
    const response = await sendRPCRequest(pattern, data);
    return res.status(response.status || 500).json(response);
  } catch (error) {
    console.error(`API Gateway Error in ${pattern}:`, error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error in API Gateway.",
    });
  }
};

export const addCommission = (req, res) => {
  return handleRPCAndRespond(
    res,
    ACCOUNTS_PATTERN.COMMISSION.ADD_COMMISSION,
    req.body
  );
};

export const getAllCommissions = (req, res) => {
  return handleRPCAndRespond(
    res,
    ACCOUNTS_PATTERN.COMMISSION.GET_ALL_COMMISSION,
    req.query
  );
};

export const getCommissionById = (req, res) => {
  return handleRPCAndRespond(
    res,
    ACCOUNTS_PATTERN.COMMISSION.GET_COMMISSION_BY_ID,
    {
      commissionId: req.params.commissionId,
    }
  );
};

export const editCommission = (req, res) => {
  return handleRPCAndRespond(res, ACCOUNTS_PATTERN.COMMISSION.EDIT_COMMISSION, {
    commissionId: req.params.commissionId,
    ...req.body,
  });
};

export const deleteCommission = (req, res) => {
  return handleRPCAndRespond(
    res,
    ACCOUNTS_PATTERN.COMMISSION.DELETE_COMMISSION,
    {
      commissionId: req.params.commissionId,
    }
  );
};

export const checkUserCommission = (req, res) => {
  console.log("Id", req.userAuth);
  return handleRPCAndRespond(
    res,
    ACCOUNTS_PATTERN.COMMISSION.GET_ALL_COMMISSION_BY_USER,
    {
      userId: req.userAuth,
    }
  );
};
