import { sendRPCRequest } from "../../../../../libs/common/rabbitMq.js";
import { PROPERTY_PATTERN } from "../../../../../libs/patterns/property/property.pattern.js";

export const getDashboardStats = async (req, res) => {
  try {
    const { propertyId } = req.query;

    const response = await sendRPCRequest(
      PROPERTY_PATTERN.DASHBOARD.GET_DASHBOARD_DATA,
      { propertyId }
    );

    if (response.success) {
      return res.status(200).json(response);
    } else {
      return res.status(500).json(response);
    }
  } catch (error) {
    console.error("Fetch dashboard data Controller Error:", error);
    return res.status(500).json({
      success: false,
      status: 500,
      message: "Failed to fetch dashboard data",
      error: error.message,
    });
  }
};
