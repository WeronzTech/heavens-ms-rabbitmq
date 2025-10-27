import { sendRPCRequest } from "../../../../../libs/common/rabbitMq.js";
import { PROPERTY_PATTERN } from "../../../../../libs/patterns/property/property.pattern.js";

const handleRPCAndRespond = async (res, pattern, data) => {
  try {
    const response = await sendRPCRequest(pattern, data); // Use status from the microservice response, default to 500 on error
    return res.status(response.status || 500).json(response);
  } catch (error) {
    console.error(`API Gateway Error in ${pattern}:`, error);
    return res
      .status(500)
      .json({ message: "Internal Server Error in API Gateway." });
  }
};

export const addFloor = (req, res) =>
  handleRPCAndRespond(res, PROPERTY_PATTERN.FLOOR.ADD_FLOOR,
    {
      ...req.body,
      adminName: req.userAuth
      }
    );

export const updateFloor = (req, res) =>
  handleRPCAndRespond(res, PROPERTY_PATTERN.FLOOR.UPDATE_FLOOR, {
    ...req.body,
    id: req.params.id, // Pass the floor ID from the URL params
    adminName: req.userAuth,
  });

export const deleteFloor = (req, res) =>
  handleRPCAndRespond(res, PROPERTY_PATTERN.FLOOR.DELETE_FLOOR, {
    id: req.params.id,
    adminName: req.userAuth
  });

export const getFloorById = (req, res) =>
  handleRPCAndRespond(res, PROPERTY_PATTERN.FLOOR.GET_FLOOR_BY_ID, {
    id: req.params.id,
  });

export const getFloorsByPropertyId = (req, res) =>
  handleRPCAndRespond(
    res,
    PROPERTY_PATTERN.FLOOR.GET_FLOORS_BY_PROPERTYID,
    req.query // Pass the entire query object (which should contain propertyId)
  );
