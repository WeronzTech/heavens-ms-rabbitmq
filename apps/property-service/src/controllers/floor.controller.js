import { PROPERTY_PATTERN } from "../../../../libs/patterns/property/property.pattern.js";
import { createResponder } from "../../../../libs/common/rabbitMq.js";
import {
  addFloor,
  updateFloor,
  deleteFloor,
  getFloorsByPropertyId,
  getFloorById,
} from "../services/floor.service.js";

// Responder for adding a new floor
createResponder(PROPERTY_PATTERN.FLOOR.ADD_FLOOR, async (data) => {
  return await addFloor(data);
});

// Responder for updating an existing floor
createResponder(PROPERTY_PATTERN.FLOOR.UPDATE_FLOOR, async (data) => {
  return await updateFloor(data);
});

// Responder for deleting a floor
createResponder(PROPERTY_PATTERN.FLOOR.DELETE_FLOOR, async (data) => {
  return await deleteFloor(data);
});

// Responder for getting all floors by a specific property ID
createResponder(
  PROPERTY_PATTERN.FLOOR.GET_FLOORS_BY_PROPERTYID,
  async (data) => {
    return await getFloorsByPropertyId(data);
  }
);

// Responder for getting a single floor by its own ID
createResponder(PROPERTY_PATTERN.FLOOR.GET_FLOOR_BY_ID, async (data) => {
  return await getFloorById(data);
});
