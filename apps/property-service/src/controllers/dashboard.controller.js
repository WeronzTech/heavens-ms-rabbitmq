import { createResponder } from "../../../../libs/common/rabbitMq.js";
import { PROPERTY_PATTERN } from "../../../../libs/patterns/property/property.pattern.js";
import { getDashboardStats } from "../services/dashbaord.service.js";
import { getLatestMaintenanceData } from "../services/maintenance.service.js";
import { calculateOccupancyRate } from "../services/property.service.js";
import { getEmployeeCount } from "../services/staff.service.js";

createResponder(PROPERTY_PATTERN.DASHBOARD.GET_DASHBOARD_DATA, async (data) => {
  return await getDashboardStats(data);
});

createResponder(PROPERTY_PATTERN.DASHBOARD.GET_STAFF_COUNTS, async (data) => {
  return await getEmployeeCount(data);
});

createResponder(
  PROPERTY_PATTERN.DASHBOARD.GET_MAINTENANCE_COUNTS,
  async (data) => {
    return await getLatestMaintenanceData(data);
  }
);

createResponder(PROPERTY_PATTERN.DASHBOARD.GET_OCCUPANCY_RATE, async (data) => {
  return await calculateOccupancyRate(data);
});
