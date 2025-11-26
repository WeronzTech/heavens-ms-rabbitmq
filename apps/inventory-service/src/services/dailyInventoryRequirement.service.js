import mongoose from "mongoose";
import DailyInventoryRequirement from "../models/dailyInventoryRequirement.model.js";
import Inventory from "../models/inventory.model.js";
import InventoryLog from "../models/inventoryLog.model.js";
import { UsageForPreparation } from "../models/usageForPreparation.model.js";
import { denormalizeQuantity, normalizeQuantity } from "../utils/helpers.js";

export const getDailyRequirements = async (data) => {
  try {
    const { kitchenId, date, status, page = 1, limit = 10 } = data;
    const query = {};

    if (kitchenId) query.kitchenId = kitchenId;
    if (status) query.status = status;
    if (date) {
      const queryDate = new Date(date);
      const startOfDay = new Date(queryDate.setHours(0, 0, 0, 0));
      const endOfDay = new Date(queryDate.setHours(23, 59, 59, 999));
      query.date = { $gte: startOfDay, $lte: endOfDay };
    }

    const requirements = await DailyInventoryRequirement.find(query)
      .populate("kitchenId", "name")
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .sort({ date: 1 })
      .lean();

    const total = await DailyInventoryRequirement.countDocuments(query);

    return {
      success: true,
      status: 200,
      data: {
        data: requirements,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / limit),
        },
      },
    };
  } catch (error) {
    console.error("Error fetching daily requirements:", error);
    return { success: false, status: 500, message: "Internal server error" };
  }
};

export const addDailyRequirement = async (data) => {
  try {
    const { kitchenId, date, items, userAuth } = data;

    if (!kitchenId || !date) {
      return {
        success: false,
        status: 400,
        message: "Kitchen ID and Date are required.",
      };
    }

    // Check if a pending requirement already exists for this kitchen and date
    const startOfDay = new Date(new Date(date).setHours(0, 0, 0, 0));
    const endOfDay = new Date(new Date(date).setHours(23, 59, 59, 999));

    const existingRequirement = await DailyInventoryRequirement.findOne({
      kitchenId,
      date: { $gte: startOfDay, $lte: endOfDay },
      status: "Pending",
    });

    if (existingRequirement) {
      return {
        success: false,
        status: 409, // Conflict
        message:
          "A pending requirement already exists for this date. Please update the existing one.",
        data: existingRequirement,
      };
    }

    const newRequirement = await DailyInventoryRequirement.create({
      kitchenId,
      date,
      items: items || [],
      status: "Pending",
      generatedBy: userAuth || "Manual Entry",
    });

    return {
      success: true,
      status: 201,
      message: "Daily requirement created successfully.",
      data: newRequirement,
    };
  } catch (error) {
    console.error("Error adding daily requirement:", error);
    return { success: false, status: 500, message: "Internal server error" };
  }
};

export const updateDailyRequirement = async (data) => {
  try {
    const { requirementId, items, userAuth } = data;

    if (!requirementId || !Array.isArray(items)) {
      return {
        success: false,
        status: 400,
        message: "Requirement ID and a list of items are required.",
      };
    }

    const requirement = await DailyInventoryRequirement.findById(requirementId);
    if (!requirement) {
      return { success: false, status: 404, message: "Requirement not found" };
    }

    if (requirement.status === "Approved") {
      return {
        success: false,
        status: 400,
        message: "Cannot update an approved requirement.",
      };
    }

    // Update the items and the 'generatedBy' field to reflect manual edit
    requirement.items = items;
    // Optionally update who modified it last, if your schema supports it
    // requirement.generatedBy = userAuth || requirement.generatedBy;

    await requirement.save();

    return {
      success: true,
      status: 200,
      message: "Daily requirement updated successfully.",
      data: requirement,
    };
  } catch (error) {
    console.error("Error updating daily requirement:", error);
    return { success: false, status: 500, message: "Internal server error" };
  }
};

export const approveDailyRequirement = async (data) => {
  try {
    const { requirementId, userAuth } = data;

    const requirement = await DailyInventoryRequirement.findById(requirementId);
    if (!requirement) {
      return { success: false, status: 404, message: "Requirement not found" };
    }

    if (requirement.status === "Approved") {
      return {
        success: false,
        status: 400,
        message: "This requirement is already approved.",
      };
    }

    // Process inventory deduction
    for (const item of requirement.items) {
      const inventoryItem = await Inventory.findById(item.inventoryId);
      if (!inventoryItem) {
        console.warn(
          `Inventory item ${item.productName} (${item.inventoryId}) not found during approval.`
        );
        continue;
      }

      // 1. Normalize current stock to base unit
      const normalizedCurrentStock = normalizeQuantity(
        inventoryItem.stockQuantity,
        inventoryItem.quantityType
      );

      // 2. Deduct the required amount (already in base unit from the model)
      const newStockInBaseUnit =
        normalizedCurrentStock.value - item.quantityRequired;

      // 3. Denormalize back to original unit
      const newStockInOriginalUnit = denormalizeQuantity(
        newStockInBaseUnit,
        inventoryItem.quantityType
      );

      // 4. Update Inventory
      inventoryItem.stockQuantity =
        newStockInOriginalUnit < 0 ? 0 : newStockInOriginalUnit;
      await inventoryItem.save();

      // 5. Create Usage Log
      await UsageForPreparation.create({
        kitchenId: requirement.kitchenId,
        inventoryId: inventoryItem._id,
        productName: inventoryItem.productName,
        quantityUsed: item.quantityRequired,
        unit: item.unit,
        preparationDate: requirement.date,
      });

      // 6. Create Inventory Activity Log
      await InventoryLog.create({
        inventoryId: inventoryItem._id,
        kitchenId: requirement.kitchenId,
        productName: inventoryItem.productName,
        quantityChanged: -item.quantityRequired, // Negative for deduction
        newStock: inventoryItem.stockQuantity,
        operation: "remove",
        performedBy: userAuth || "system",
        notes: `Daily Usage Approved for ${new Date(
          requirement.date
        ).toDateString()}`,
      });
    }

    // Mark as Approved
    requirement.status = "Approved";
    await requirement.save();

    return {
      success: true,
      status: 200,
      message: "Daily requirement approved and inventory updated.",
      data: requirement,
    };
  } catch (error) {
    console.error("Error approving requirement:", error);
    return { success: false, status: 500, message: "Internal server error" };
  }
};

export const rejectDailyRequirement = async (data) => {
  try {
    const { requirementId } = data;

    const requirement = await DailyInventoryRequirement.findById(requirementId);
    if (!requirement) {
      return { success: false, status: 404, message: "Requirement not found" };
    }

    if (requirement.status === "Approved") {
      return {
        success: false,
        status: 400,
        message: "Cannot delete an approved requirement.",
      };
    }

    // Per requirements: "on cancel this data created will be deleted"
    await DailyInventoryRequirement.findByIdAndDelete(requirementId);

    return {
      success: true,
      status: 200,
      message: "Daily requirement deleted successfully.",
    };
  } catch (error) {
    console.error("Error rejecting requirement:", error);
    return { success: false, status: 500, message: "Internal server error" };
  }
};
