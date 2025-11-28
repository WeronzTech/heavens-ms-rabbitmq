import mongoose from "mongoose";
import DailyInventoryRequirement from "../models/dailyInventoryRequirement.model.js";
import Inventory from "../models/inventory.model.js";
import InventoryLog from "../models/inventoryLog.model.js";
import Kitchen from "../models/kitchen.model.js";
import { UsageForPreparation } from "../models/usageForPreparation.model.js";
import { denormalizeQuantity, normalizeQuantity } from "../utils/helpers.js";

export const getDailyRequirements = async (data) => {
  try {
    const { kitchenId, date, page = 1, limit = 10 } = data;
    const query = {};

    if (kitchenId) query.kitchenId = kitchenId;
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

// export const addItemToRequirement = async (data) => {
//   try {
//     const { requirementId, inventoryId, quantityRequired, unit } = data;

//     const requirement = await DailyInventoryRequirement.findById(requirementId);
//     if (!requirement) {
//       return { success: false, status: 404, message: "Requirement not found" };
//     }

//     if (requirement.status === "Approved") {
//       return {
//         success: false,
//         status: 400,
//         message: "Cannot add items to approved requirements",
//       };
//     }

//     // Get inventory item details
//     const inventoryItem = await Inventory.findById(inventoryId);
//     if (!inventoryItem) {
//       return {
//         success: false,
//         status: 404,
//         message: "Inventory item not found",
//       };
//     }

//     // Check if item already exists in requirement
//     const existingItemIndex = requirement.items.findIndex(
//       (item) => item.inventoryId.toString() === inventoryId
//     );

//     if (existingItemIndex > -1) {
//       // Update existing item quantity
//       requirement.items[existingItemIndex].quantityRequired += quantityRequired;
//     } else {
//       // Add new item
//       requirement.items.push({
//         inventoryId: inventoryId,
//         productName: inventoryItem.productName,
//         quantityRequired: quantityRequired,
//         unit: inventoryItem.quantityType === "kg" ? "g" : "ml",
//       });
//     }

//     requirement.updatedAt = new Date();
//     await requirement.save();

//     return {
//       success: true,
//       status: 200,
//       message: "Item added to requirement successfully",
//       data: requirement,
//     };
//   } catch (error) {
//     console.error("Error adding item to requirement:", error);
//     return { success: false, status: 500, message: "Internal server error" };
//   }
// };

export const addItemToRequirement = async (data) => {
  try {
    const { requirementId, inventoryId, quantityRequired, unit } = data;

    const requirement = await DailyInventoryRequirement.findById(requirementId);
    if (!requirement) {
      return { success: false, status: 404, message: "Requirement not found" };
    }

    if (requirement.status === "Approved") {
      return {
        success: false,
        status: 400,
        message: "Cannot add items to approved requirements",
      };
    }

    // Get inventory item
    const inventoryItem = await Inventory.findById(inventoryId);
    if (!inventoryItem) {
      return {
        success: false,
        status: 404,
        message: "Inventory item not found",
      };
    }

    // Determine base unit
    let baseUnit = inventoryItem.quantityType === "kg" ? "g" : "ml";

    // Convert incoming quantity TO BASE UNIT
    let convertedQty = quantityRequired;

    if (unit !== baseUnit) {
      if (unit === "kg" && baseUnit === "g")
        convertedQty = quantityRequired * 1000;
      else if (unit === "g" && baseUnit === "g")
        convertedQty = quantityRequired;
      else if (unit === "l" && baseUnit === "ml")
        convertedQty = quantityRequired * 1000;
      else if (unit === "ml" && baseUnit === "ml")
        convertedQty = quantityRequired;
      else {
        return {
          success: false,
          status: 400,
          message: `Cannot convert unit ${unit} to ${baseUnit}`,
        };
      }
    }

    // Convert inventory stockQuantity ALSO to base unit
    let stockInBase = inventoryItem.stockQuantity;

    if (inventoryItem.quantityType === "kg") stockInBase *= 1000;
    else if (inventoryItem.quantityType === "l") stockInBase *= 1000;
    // If already in g/ml → no change

    // Validate stock
    if (convertedQty > stockInBase) {
      return {
        success: false,
        status: 400,
        message: `Requested quantity exceeds available stock. Available: ${stockInBase} ${baseUnit}`,
      };
    }

    // Check existing item in requirement
    const existingItemIndex = requirement.items.findIndex(
      (item) => item.inventoryId.toString() === inventoryId
    );

    if (existingItemIndex > -1) {
      const totalRequired =
        requirement.items[existingItemIndex].quantityRequired + convertedQty;

      if (totalRequired > stockInBase) {
        return {
          success: false,
          status: 400,
          message: "Total required quantity exceeds available stock",
        };
      }

      requirement.items[existingItemIndex].quantityRequired = totalRequired;
    } else {
      // Add new item in BASE UNIT
      requirement.items.push({
        inventoryId,
        productName: inventoryItem.productName,
        quantityRequired: convertedQty,
        unit: baseUnit, // Always base unit!!
      });
    }

    requirement.updatedAt = new Date();
    await requirement.save();

    return {
      success: true,
      status: 200,
      message: "Item added to requirement successfully",
      data: requirement,
    };
  } catch (error) {
    console.error("Error adding item to requirement:", error);
    return { success: false, status: 500, message: "Internal server error" };
  }
};

export const updateDailyRequirements = async (data) => {
  try {
    const { requirementId, items } = data;

    const requirement = await DailyInventoryRequirement.findById(requirementId);
    if (!requirement) {
      return { success: false, status: 404, message: "Requirement not found" };
    }

    if (requirement.status === "Approved") {
      return {
        success: false,
        status: 400,
        message: "Cannot update approved requirements",
      };
    }

    // Update items array
    requirement.items = items;
    requirement.updatedAt = new Date();

    await requirement.save();

    return {
      success: true,
      status: 200,
      message: "Daily requirement updated successfully",
      data: requirement,
    };
  } catch (error) {
    console.error("Error updating requirement:", error);
    return { success: false, status: 500, message: "Internal server error" };
  }
};

export const removeItemFromRequirement = async (data) => {
  try {
    console.log(data);
    const { requirementId, inventoryId } = data;

    const requirement = await DailyInventoryRequirement.findById(requirementId);
    if (!requirement) {
      return { success: false, status: 404, message: "Requirement not found" };
    }

    if (requirement.status === "Approved") {
      return {
        success: false,
        status: 400,
        message: "Cannot remove items from approved requirements",
      };
    }

    // Remove item from items array
    requirement.items = requirement.items.filter(
      (item) => item.inventoryId.toString() !== inventoryId
    );

    requirement.updatedAt = new Date();
    await requirement.save();

    return {
      success: true,
      status: 200,
      message: "Item removed from requirement successfully",
      data: requirement,
    };
  } catch (error) {
    console.error("Error removing item from requirement:", error);
    return { success: false, status: 500, message: "Internal server error" };
  }
};

// export const addDailyRequirement = async (data) => {
//   try {
//     const { kitchenId, date, items, userAuth } = data;

//     if (!kitchenId || !date) {
//       return {
//         success: false,
//         status: 400,
//         message: "Kitchen ID and Date are required.",
//       };
//     }

//     // Check if a pending requirement already exists for this kitchen and date
//     const startOfDay = new Date(new Date(date).setHours(0, 0, 0, 0));
//     const endOfDay = new Date(new Date(date).setHours(23, 59, 59, 999));

//     const existingRequirement = await DailyInventoryRequirement.findOne({
//       kitchenId,
//       date: { $gte: startOfDay, $lte: endOfDay },
//       status: "Pending",
//     });

//     if (existingRequirement) {
//       return {
//         success: false,
//         status: 409, // Conflict
//         message:
//           "A pending requirement already exists for this date. Please update the existing one.",
//         data: existingRequirement,
//       };
//     }

//     const newRequirement = await DailyInventoryRequirement.create({
//       kitchenId,
//       date,
//       items: items || [],
//       status: "Pending",
//       generatedBy: userAuth || "Manual Entry",
//     });

//     return {
//       success: true,
//       status: 201,
//       message: "Daily requirement created successfully.",
//       data: newRequirement,
//     };
//   } catch (error) {
//     console.error("Error adding daily requirement:", error);
//     return { success: false, status: 500, message: "Internal server error" };
//   }
// };

// export const updateDailyRequirement = async (data) => {
//   try {
//     const { requirementId, items, userAuth } = data;

//     if (!requirementId || !Array.isArray(items)) {
//       return {
//         success: false,
//         status: 400,
//         message: "Requirement ID and a list of items are required.",
//       };
//     }

//     const requirement = await DailyInventoryRequirement.findById(requirementId);
//     if (!requirement) {
//       return { success: false, status: 404, message: "Requirement not found" };
//     }

//     if (requirement.status === "Approved") {
//       return {
//         success: false,
//         status: 400,
//         message: "Cannot update an approved requirement.",
//       };
//     }

//     // Update the items and the 'generatedBy' field to reflect manual edit
//     requirement.items = items;
//     // Optionally update who modified it last, if your schema supports it
//     // requirement.generatedBy = userAuth || requirement.generatedBy;

//     await requirement.save();

//     return {
//       success: true,
//       status: 200,
//       message: "Daily requirement updated successfully.",
//       data: requirement,
//     };
//   } catch (error) {
//     console.error("Error updating daily requirement:", error);
//     return { success: false, status: 500, message: "Internal server error" };
//   }
// };

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

export const getInventoryItems = async (data) => {
  try {
    const { search = "", propertyId, kitchenId, requirementId } = data;

    const query = {
      ...(search && { productName: { $regex: search, $options: "i" } }),
    };

    // Validate kitchenId
    if (kitchenId) {
      if (!mongoose.Types.ObjectId.isValid(kitchenId))
        return {
          success: false,
          status: 400,
          message: "Invalid kitchenId format.",
        };
      query.kitchenId = { $in: [kitchenId] };
    }

    // Property -> Kitchens -> Inventory
    else if (propertyId) {
      if (!mongoose.Types.ObjectId.isValid(propertyId))
        return {
          success: false,
          status: 400,
          message: "Invalid propertyId format.",
        };

      const kitchens = await Kitchen.find({ propertyId }).select("_id");
      const kitchenIds = kitchens.map((k) => k._id);

      if (!kitchenIds.length)
        return {
          success: true,
          status: 200,
          data: [],
        };

      query.kitchenId = { $in: kitchenIds };
    }

    // Fetch requirement items (to exclude them)
    let requirementItems = [];
    if (requirementId) {
      if (!mongoose.Types.ObjectId.isValid(requirementId))
        return {
          success: false,
          status: 400,
          message: "Invalid requirementId format.",
        };

      const requirement = await DailyInventoryRequirement.findById(
        requirementId
      ).select("items");

      if (requirement) {
        requirementItems = requirement.items.map((item) =>
          item.inventoryId.toString()
        );
      }
    }

    // Fetch all inventory items
    let inventoryData = await Inventory.find(query)
      .populate("categoryId")
      .sort({ createdAt: -1 })
      .lean();

    // Filter items NOT in the requirement
    if (requirementItems.length > 0) {
      inventoryData = inventoryData.filter(
        (inv) => !requirementItems.includes(inv._id.toString())
      );
    }

    return {
      success: true,
      status: 200,
      message: "Inventory retrieved successfully.",
      data: inventoryData,
    };
  } catch (err) {
    return { success: false, status: 500, message: err.message };
  }
};
