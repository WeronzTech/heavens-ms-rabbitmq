import { createResponder } from "../../../../libs/common/rabbitMq.js";
import { PROPERTY_PATTERN } from "../../../../libs/patterns/property/property.pattern.js";
import Property from "../models/property.model.js";
import PropertyLog from "../models/propertyLog.model.js";
import {
  createProperty,
  updateProperty,
} from "../services/property.service.js";

createResponder(PROPERTY_PATTERN.PROPERTY.CREATE_PROPERTY, async (data) => {
  return await createProperty(data);
});

createResponder(PROPERTY_PATTERN.PROPERTY.UPDATE_PROPERTY, async (data) => {
  return await updateProperty(data);
});

export const getClientProperties = async (req, res) => {
  try {
    const clientId = req.user.clientId;
    console.log(clientId);

    const properties = await Property.find({ clientId });

    res.status(200).json({
      message: "Properties fetched successfully",
      data: properties,
    });
  } catch (error) {
    console.error("Fetch Properties Error:", error);
    res.status(500).json({
      message: "Failed to fetch properties",
      error: error.message,
    });
  }
};

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

export const getAllHeavensProperties = async (req, res) => {
  try {
    const { propertyId } = req.query;

    let heavensProperties;
    if (propertyId) {
      const property = await Property.findOne({
        _id: propertyId,
        isHeavens: true,
      });

      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }

      heavensProperties = [property]; // ✅ wrap in array
    } else {
      heavensProperties = await Property.find({ isHeavens: true });
    }

    res.status(200).json(heavensProperties);
  } catch (error) {
    console.error("Fetch Heavens Properties Error:", error);
    res.status(500).json({
      message: "Failed to fetch heavens properties",
      error: error.message,
    });
  }
};

// Get a single property by ID
export const getPropertyById = async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property) {
      return res.status(404).json({ message: "Property not found" });
    }
    res.status(200).json(property);
  } catch (error) {
    console.error("Fetch Property Error:", error);
    res
      .status(500)
      .json({ message: "Failed to fetch property", error: error.message });
  }
};

// Update/Edit property

// Delete property
