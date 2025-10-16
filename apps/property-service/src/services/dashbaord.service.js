import { sendRPCRequest } from "../../../../libs/common/rabbitMq.js";
import { PROPERTY_PATTERN } from "../../../../libs/patterns/property/property.pattern.js";
import { USER_PATTERN } from "../../../../libs/patterns/user/user.pattern.js";

export const getDashboardStats = async (data) => {
  try {
    const propertyId =
      data?.propertyId && typeof data.propertyId === "string"
        ? data.propertyId
        : undefined;

    const [residentCounts, employees, maintenance, occupancy, reminders] =
      await Promise.all([
        sendRPCRequest(USER_PATTERN.DASHBOARD.GET_USERS_COUNTS, { propertyId }),
        sendRPCRequest(PROPERTY_PATTERN.DASHBOARD.GET_STAFF_COUNTS, {
          propertyId,
        }),
        sendRPCRequest(PROPERTY_PATTERN.DASHBOARD.GET_MAINTENANCE_COUNTS, {
          propertyId,
        }),
        sendRPCRequest(PROPERTY_PATTERN.DASHBOARD.GET_OCCUPANCY_RATE, {
          propertyId,
        }),
        sendRPCRequest(USER_PATTERN.REMINDER_NOTE.GET_ACTIVE_REMINDERS, {
          propertyId,
        }),
      ]);

    return {
      success: true,
      data: {
        residents: residentCounts.monthlyResidents,
        dailyRenters: residentCounts.dailyRenters,
        employees,
        maintenance,
        reminders,
        occupancy,
      },
    };
  } catch (error) {
    console.error("Error in getDashboardStats:", error);

    return {
      success: false,
      message: "Failed to load dashboard data",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    };
  }
};
