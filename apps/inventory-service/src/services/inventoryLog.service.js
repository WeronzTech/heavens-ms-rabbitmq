import InventoryLog from "../models/inventoryLog.model.js";

export const getInventoryLogs = async (data) => {
  try {
    const { page = 1, limit = 10, startDate, endDate } = data;

    const filter = {};

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

    const logs = await InventoryLog.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .select("-__v")
      .lean();

    const total = await InventoryLog.countDocuments(filter);

    return {
      success: true,
      status: 200,
      message: "Logs retrieved successfully.",
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
    console.error("Error fetching inventory logs:", error);
    return {
      success: false,
      status: 500,
      message: "Failed to fetch activity logs",
    };
  }
};
