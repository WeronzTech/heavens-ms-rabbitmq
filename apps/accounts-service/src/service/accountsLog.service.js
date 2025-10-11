import AccountsLog from "../models/accountsLog.model.js";

export const createAccountLog = async (logData) => {
  try {
    await AccountsLog.create(logData);
    console.log(`[ACCOUNTS_LOG]: ${logData.description}`);
  } catch (error) {
    console.error("Failed to create account log:", error);
    // This is an internal utility, so we just log the error and don't throw/return
  }
};

export const getAccountLogs = async (filters) => {
  try {
    const {
      propertyId,
      logType,
      action,
      startDate,
      endDate,
      page = 1,
      limit = 10,
    } = filters;
    const query = {};

    if (propertyId) query.propertyId = propertyId;
    if (logType) query.logType = logType;
    if (action) query.action = action;
    if (startDate && endDate) {
      query.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }

    const skip = (page - 1) * limit;
    const logs = await AccountsLog.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await AccountsLog.countDocuments(query);

    return {
      success: true,
      status: 200,
      message: "Account logs retrieved successfully.",
      data: logs,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    console.error("Get Account Logs Service Error:", error);
    return {
      success: false,
      status: 500,
      message: "Internal Server Error",
      error: error.message,
    };
  }
};
