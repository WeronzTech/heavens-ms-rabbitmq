import { sendRPCRequest } from "../../../../../libs/common/rabbitMq.js";
import { USER_PATTERN } from "../../../../../libs/patterns/user/user.pattern.js";

export const getActivityLogs = async (req, res) => {
  try {
    console.log("herererer");
    const { propertyId, page = 1, limit = 10, startDate, endDate } = req.query;

    const response = await sendRPCRequest(USER_PATTERN.LOG.GET_ACTIVITY_LOGS, {
      propertyId,
      page,
      limit,
      startDate,
      endDate,
    });

    return res
      .status(response?.status || 500)
      .json(response?.body || { error: "Invalid RPC response" });
  } catch (error) {
    console.error("[API-GATEWAY] getActivityLogsHandler error:", error);
    return res.status(500).json({ error: "Failed to fetch activity logs" });
  }
};
