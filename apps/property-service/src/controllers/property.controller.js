import { createResponder } from "../../../../libs/common/rabbitMq.js";
import { PROPERTY_PATTERN } from "../../../../libs/patterns/property/property.pattern.js";
import Property from "../models/property.model.js";
import PropertyLog from "../models/propertyLog.model.js";
import { 
   createProperty,
   deleteProperty, 
   updateProperty, 
   getPropertyById, 
   getAllHeavensProperties, 
   getClientProperties } from "../services/property.service.js";




createResponder(PROPERTY_PATTERN.PROPERTY.CREATE_PROPERTY, async (data) => {
  return await createProperty(data);
})

createResponder(PROPERTY_PATTERN.PROPERTY.UPDATE_PROPERTY, async (data) => {
  return await updateProperty(data);
})

createResponder(PROPERTY_PATTERN.PROPERTY.DELETE_PROPERTY, async (data) => {
  return await deleteProperty(data);
})

createResponder(PROPERTY_PATTERN.PROPERTY.GET_PROPERTY_BY_ID, async (data) => {
  return await getPropertyById(data);
})

createResponder(PROPERTY_PATTERN.PROPERTY.GET_ALL_HEAVENS_PROPERTIES, async (data) => {
  return await getAllHeavensProperties(data);
})

createResponder(PROPERTY_PATTERN.PROPERTY.GET_CLIENT_PROPERTIES, async (data) => {
  return await getClientProperties(data);
})


// Get all properties
export const getAllProperties = async (req, res) => {
  try {
    const properties = await Property.find();
    res.status(200).json(properties);
  } catch (error) {
    console.error("Fetch Properties Error:", error);
    res
      .status(500)
      .json({ message: "Failed to fetch properties", error: error.message });
  }
};


