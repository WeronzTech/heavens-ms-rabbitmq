import { createResponder } from "../../../../libs/common/rabbitMq.js";
import { PROPERTY_PATTERN } from "../../../../libs/patterns/property/property.pattern.js";
import {
  createProperty,
  deleteProperty,
  getAllHeavensProperties,
  getClientProperties,
  getPropertyById,
  updateProperty,
} from "../services/property.service.js";

createResponder(PROPERTY_PATTERN.PROPERTY.CREATE_PROPERTY, async (data) => {
  return await createProperty(data);
});

createResponder(PROPERTY_PATTERN.PROPERTY.UPDATE_PROPERTY, async (data) => {
  return await updateProperty(data);
});

createResponder(PROPERTY_PATTERN.PROPERTY.DELETE_PROPERTY, async (data) => {
  return await deleteProperty(data);
});

createResponder(PROPERTY_PATTERN.PROPERTY.GET_PROPERTY_BY_ID, async (data) => {
  return await getPropertyById(data);
});

createResponder(PROPERTY_PATTERN.PROPERTY.GET_ALL_HEAVENS_PROPERTIES, async (data) => {
  return await getAllHeavensProperties(data);
});

createResponder(PROPERTY_PATTERN.PROPERTY.GET_CLIENT_PROPERTIES, async (data) => {
  return await getClientProperties(data);
});

