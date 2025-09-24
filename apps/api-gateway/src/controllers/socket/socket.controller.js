import { sendRPCRequest } from "../../../../../libs/common/rabbitMq.js";
import { SOCKET_PATTERN } from "../../../../../libs/patterns/socket/socket.pattern.js";

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

export const emitEvent = (req, res) => {
  return handleRPCAndRespond(res, SOCKET_PATTERN.EMIT, req.body);
};

export const createPermission = (req, res) => {
  return handleRPCAndRespond(res, SOCKET_PATTERN.PERMISSION.CREATE, req.body);
};

export const getAllPermissions = (req, res) => {
  return handleRPCAndRespond(res, SOCKET_PATTERN.PERMISSION.GET_ALL, req.query);
};

export const getPermissionById = (req, res) => {
  return handleRPCAndRespond(res, SOCKET_PATTERN.PERMISSION.GET_BY_ID, {
    id: req.params.id,
  });
};

export const updatePermission = (req, res) => {
  return handleRPCAndRespond(res, SOCKET_PATTERN.PERMISSION.UPDATE, {
    ...req.body,
    id: req.params.id,
  });
};

export const deletePermission = (req, res) => {
  return handleRPCAndRespond(res, SOCKET_PATTERN.PERMISSION.DELETE, {
    id: req.params.id,
  });
};
