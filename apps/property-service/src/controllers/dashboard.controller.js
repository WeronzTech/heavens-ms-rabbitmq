
import {
  // getEmployeeCount,
  // calculateOccupancyRate,
  // getLatestMaintenanceData,
} from "../services/property.service.js";

export const getDashboardStats = async (req, res) => {
  try {
    const {propertyId} = req.query; // get from request query

    const [residentCounts, employees, maintenance, occupancy] =
      await Promise.all([
        getResidentCounts(propertyId),
        getEmployeeCount(propertyId),
        getLatestMaintenanceData(propertyId),
        // calculateOccupancyRate(propertyId),
      ]);

    res.json({
      success: true,
      data: {
        residents: residentCounts.monthlyResidents,
        dailyRenters: residentCounts.dailyRenters,
        employees,
        maintenance,
        occupancy,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to load dashboard data",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};
