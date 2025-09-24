// services/activityLogService.js
import PropertyLog from "../models/propertyLog.model.js";

export const getActivityLogs= async (data) => {
  try {
    const {
      propertyId,
      category,
      page = 1,
      limit = 10,
      startDate,
      endDate,
    } = data;

    const filter = {};

    if (category) filter.category = category;
    if (propertyId) filter.propertyId = propertyId;

    // Date filter
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        filter.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = endOfDay;
      }
    }

    // Logs with pagination
    const logs = await PropertyLog.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .select("-__v")
      .lean();

    const total = await PropertyLog.countDocuments(filter);

    return {
      status: 200,
      success: true,
      data: {
        logs,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    };
  } catch (error) {
    console.error("Error in getActivityLogsService:", error);
    return {
      status: 500,
      success: false,
      message: "Failed to fetch activity logs",
    };
  }
};
