import { sendRPCRequest } from "../../../../../libs/common/rabbitMq.js";
import { CLIENT_PATTERN } from "../../../../../libs/patterns/client/client.pattern.js";

const handleRPCAndRespond = async (res, pattern, data) => {
  try {
    const response = await sendRPCRequest(pattern, data);
    return res.status(response.status || 500).json(response);
  } catch (error) {
    console.error(`API Gateway Error in ${pattern}:`, error);
    return res
      .status(500)
      .json({
        success: false,
        message: "Internal Server Error in API Gateway.",
      });
  }
};

export const getAllAgencies = (req, res) => {
  return handleRPCAndRespond(
    res,
    CLIENT_PATTERN.AGENCY.GET_AGENCIES,
    req.query
  );
};

export const addAgency = (req, res) => {
  return handleRPCAndRespond(res, CLIENT_PATTERN.AGENCY.ADD_AGENCY, req.body);
};

export const editAgency = (req, res) => {
  return handleRPCAndRespond(res, CLIENT_PATTERN.AGENCY.EDIT_AGENCY, {
    agencyId: req.params.agencyId,
    ...req.body,
  });
};

export const deleteAgency = (req, res) => {
  return handleRPCAndRespond(res, CLIENT_PATTERN.AGENCY.DELETE_AGENCY, {
    agencyId: req.params.agencyId,
  });
};

export const getAgencyById = (req, res) => {
  return handleRPCAndRespond(res, CLIENT_PATTERN.AGENCY.GET_AGENCY_BY_ID, {
    agencyId: req.params.agencyId,
  });
};
