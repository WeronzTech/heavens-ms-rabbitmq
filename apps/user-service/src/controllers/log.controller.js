import mongoose from "mongoose";
// import UserLog from "../models/userLog.modal.js";
import {getAccessibleKitchens} from "../services/inventory.service.js";

export const getActivityLogs = async (req, res) => {
  try {
    const {propertyId, page = 1, limit = 10, startDate, endDate} = req.query;

    // Build the base filter
    const filter = {};

    // Handle property filtering
    if (propertyId && mongoose.Types.ObjectId.isValid(propertyId)) {
      const accessibleKitchens = await getAccessibleKitchens(propertyId);
      const accessibleKitchenIds = accessibleKitchens.map((k) =>
        k._id.toString()
      );

      filter.$or = [{propertyId}, {kitchenId: {$in: accessibleKitchenIds}}];
    } else {
      filter.propertyId = {$exists: true};
    }

    // Date filtering - changed from timestamp to createdAt
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        filter.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        // Include the entire end date by setting to end of day
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = endOfDay;
      }
    }

    // Get logs with pagination
    const logs = await UserLog.find(filter)
      .sort({createdAt: -1})
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .select("-__v")
      .lean();

    // Get total count
    const total = await UserLog.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching activity logs:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch activity logs",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};
