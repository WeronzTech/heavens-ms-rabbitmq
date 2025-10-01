import PettyCash from "../models/pettyCash.model.js";
import Manager from "../models/manager.model.js";
import mongoose from "mongoose";

export const addPettyCash = async (data) => {
  try {
    const {
      inHandAmount,
      inAccountAmount,
      manager,
      managerName,
      property: requestedProperty,
    } = data;

    // Find the manager
    const client = await Manager.findById(manager);
    if (!client) {
      return {
        success: false,
        message: "Manager not found",
        status: 404,
        data: null,
      };
    }

    // Get properties from manager
    let properties = client.propertyId;

    // Ensure properties is an array
    if (!Array.isArray(properties)) {
      properties = properties ? [properties] : [];
    }

    if (properties.length === 0) {
      return {
        success: false,
        message: "Manager is not associated with any property",
        status: 400,
        data: null,
      };
    }

    let property;

    // If property is specified in request, use it (after validation)
    if (requestedProperty) {
      const isValidProperty = properties.some(
        (p) =>
          p.toString() === requestedProperty.toString() ||
          (p._id && p._id.toString() === requestedProperty.toString())
      );

      if (!isValidProperty) {
        return {
          success: false,
          message: "Manager is not associated with the specified property",
          status: 400,
          data: null,
        };
      }
      property = requestedProperty;
    } else {
      // Use the first property by default
      property = properties[0];
    }

    // Find existing petty cash by manager ID and property
    let existingPettyCash = await PettyCash.findOne({
      manager,
      property: property._id || property,
    });

    if (existingPettyCash) {
      // Update existing petty cash
      existingPettyCash.inHandAmount += Number(inHandAmount || 0);
      existingPettyCash.inAccountAmount += Number(inAccountAmount || 0);
      existingPettyCash.updatedAt = new Date();
      await existingPettyCash.save();
    } else {
      // Create new petty cash entry
      existingPettyCash = new PettyCash({
        inHandAmount: Number(inHandAmount || 0),
        inAccountAmount: Number(inAccountAmount || 0),
        manager,
        managerName,
        property: property._id || property,
      });
      await existingPettyCash.save();
    }

    return {
      success: true,
      message: "Petty cash updated successfully",
      status: 200,
      data: {
        id: existingPettyCash._id,
        inHandAmount: existingPettyCash.inHandAmount,
        inAccountAmount: existingPettyCash.inAccountAmount,
        manager: existingPettyCash.manager,
        managerName: existingPettyCash.managerName,
        property: existingPettyCash.property,
        createdAt: existingPettyCash.createdAt,
        updatedAt: existingPettyCash.updatedAt,
      },
    };
  } catch (error) {
    console.error("Petty cash service error:", error);

    return {
      success: false,
      message: "Failed to add/update petty cash",
      error: error.message,
      status: 500,
      data: null,
    };
  }
};

export const getPettyCash = async (data) => {
  try {
    const { propertyId } = data;

    let filter = {};

    if (propertyId) {
      // Step 1: get managers belonging to this property
      const managers = await Manager.find({
        propertyId: { $in: [new mongoose.Types.ObjectId(propertyId)] },
      }).select("_id");

      const managerIds = managers.map((m) => m._id);

      // Step 2: filter petty cash by those manager IDs
      filter.manager = { $in: managerIds };
    }

    const pettyCashRecords = await PettyCash.find(filter).lean();

    return {
      success: true,
      status: 200,
      data: pettyCashRecords,
    };
  } catch (error) {
    console.error("Petty cash fetch error:", error);
    return {
      success: false,
      status: 500,
      message: "Failed to fetch petty cash records",
      error: error.message,
      data: null,
    };
  }
};

export const getPettyCashByManager = async (data) => {
  try {
    const { managerId } = data;

    if (!managerId) {
      return {
        success: false,
        status: 400,
        message: "Manager ID is required",
        data: null,
      };
    }

    const pettyCash = await PettyCash.findOne({ manager: managerId }).lean();

    if (!pettyCash) {
      return {
        success: true,
        status: 200,
        message: "No petty cash found for this manager",
        data: {
          inHandAmount: 0,
          inAccountAmount: 0,
          total: 0,
          manager: managerId,
        },
      };
    }

    const { inHandAmount = 0, inAccountAmount = 0, manager } = pettyCash;
    const total = inHandAmount + inAccountAmount;

    return {
      success: true,
      status: 200,
      message: "Petty cash fetched successfully",
      data: {
        inHandAmount,
        inAccountAmount,
        total,
        manager,
      },
    };
  } catch (error) {
    console.error("Petty cash service error:", error);
    return {
      success: false,
      status: 500,
      message: "Failed to fetch petty cash",
      error: error.message,
      data: null,
    };
  }
};
