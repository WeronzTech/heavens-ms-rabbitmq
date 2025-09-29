import { sendRPCRequest } from "../../../../../libs/common/rabbitMq.js";
import { PROPERTY_PATTERN } from "../../../../../libs/patterns/property/property.pattern.js";

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

export const createMaintenance = (req, res) => {
  const { body: payload, files } = req;

  const filesAsBase64 = {};
  if (files && files.issueImage) {
    filesAsBase64.issueImage = {
      buffer: files.issueImage[0].buffer.toString("base64"),
      originalname: files.issueImage[0].originalname,
      mimetype: files.issueImage[0].mimetype,
    };
  }

  handleRPCAndRespond(res, PROPERTY_PATTERN.MAINTENANCE.CREATE, {
    payload,
    files: filesAsBase64,
  });
};

export const getMaintenanceByProperty = (req, res) =>
  handleRPCAndRespond(res, PROPERTY_PATTERN.MAINTENANCE.GET_BY_PROPERTY, {
    propertyId: req.params.propertyId,
    filters: req.query,
  });

export const getMaintenanceByUserId = (req, res) =>
  handleRPCAndRespond(res, PROPERTY_PATTERN.MAINTENANCE.GET_BY_USER, {
    userId: req.params.userId,
    filters: req.query,
  });

export const assignStaffToMaintenance = (req, res) =>
  handleRPCAndRespond(res, PROPERTY_PATTERN.MAINTENANCE.ASSIGN_STAFF, {
    maintenanceId: req.params.maintenanceId,
    ...req.body,
  });

export const markAsResolved = (req, res) =>
  handleRPCAndRespond(res, PROPERTY_PATTERN.MAINTENANCE.MARK_RESOLVED, {
    maintenanceId: req.params.maintenanceId,
    ...req.body,
  });

export const getMaintenanceById = (req, res) =>
  handleRPCAndRespond(res, PROPERTY_PATTERN.MAINTENANCE.GET_BY_ID, {
    maintenanceId: req.params.maintenanceId,
  });

export const getAllMaintenance = (req, res) =>
  handleRPCAndRespond(res, PROPERTY_PATTERN.MAINTENANCE.GET_ALL, {});

export const updateMaintenance = (req, res) =>
  handleRPCAndRespond(res, PROPERTY_PATTERN.MAINTENANCE.UPDATE, {
    maintenanceId: req.params.id,
    updateData: req.body,
  });

export const deleteMaintenance = (req, res) =>
  handleRPCAndRespond(res, PROPERTY_PATTERN.MAINTENANCE.DELETE, {
    maintenanceId: req.params.id,
  });
