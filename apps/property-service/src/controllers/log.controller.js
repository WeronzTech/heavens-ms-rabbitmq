import PropertyLog from "../models/propertyLog.model.js";

export const getActivityLogs = async (req, res) => {
  try {
    const {
      propertyId,
      category,
      page = 1,
      limit = 10,
      startDate,
      endDate,
    } = req.query;
    console.log(req.query);
    // Base filter
    const filter = {};

    // Category filter if provided
    if (category) {
      filter.category = category;
    }

    // Property-specific filter
    if (propertyId) {
      filter.propertyId = propertyId;
    }

    // Date filtering
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

    // Get logs with pagination
    const logs = await PropertyLog.find(filter)
      .sort({createdAt: -1})
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .select("-__v")
      .lean();

    // Get total count
    const total = await PropertyLog.countDocuments(filter);

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
