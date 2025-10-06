import StaffSalaryHistory from "../models/staffSalaryHistory.model.js";
import { sendRPCRequest } from "../../../../libs/common/rabbitMq.js";
import { PROPERTY_PATTERN } from "../../../../libs/patterns/property/property.pattern.js";
import { CLIENT_PATTERN } from "../../../../libs/patterns/client/client.pattern.js";

export const manualAddSalary = async (data) => {
  try {
    const { employeeId, employeeType, salary, date, paidBy } = data;
    if (!employeeId || !employeeType || !salary || !date || !paidBy) {
      return {
        success: false,
        status: 400,
        message:
          "Missing required fields: employeeId, employeeType, salary, date, paidBy.",
      };
    }

    const newSalaryRecord = await StaffSalaryHistory.create({
      ...data,
      salaryPending: salary,
      status: "pending",
      remarkType: "MANUAL_ADDITION",
    });
    return {
      success: true,
      status: 201,
      message: "Salary record added successfully.",
      data: newSalaryRecord,
    };
  } catch (error) {
    console.error("Manual Add Salary Service Error:", error);
    return {
      success: false,
      status: 500,
      message: "Internal Server Error",
      error: error.message,
    };
  }
};

export const getAllSalaryRecords = async (filters) => {
  try {
    const { employeeId, propertyId, startDate, endDate } = filters;
    const query = {};

    if (employeeId) query.employeeId = employeeId;
    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    if (propertyId) {
      const [staffResponse, managerResponse] = await Promise.all([
        sendRPCRequest(PROPERTY_PATTERN.STAFF.GET_STAFF_BY_PROPERTYID, {
          propertyId,
        }),
        sendRPCRequest(CLIENT_PATTERN.MANAGER.GET_ALL_MANAGERS, { propertyId }),
      ]);

      const staffIds = (staffResponse.data || [])
        .filter((s) => s.status === "Active")
        .map((s) => s._id);

      const managerIds = (managerResponse.data || [])
        .filter((m) => m.status === "Active")
        .map((m) => m._id);
      const employeeIds = [...staffIds, ...managerIds];

      if (employeeIds.length === 0) {
        return {
          success: true,
          status: 200,
          message: "No employees found for this property.",
          data: [],
        };
      }
      query.employeeId = { $in: employeeIds };
    }

    const records = await StaffSalaryHistory.find(query)
      .populate({
        path: "employeeId",
        select: "name staffId managerId", // Select identifiers
      })
      .populate("paidBy", "name")
      .sort({ date: -1 });

    return {
      success: true,
      status: 200,
      message: "Salary records retrieved successfully.",
      data: records,
    };
  } catch (error) {
    console.error("Get All Salary Records Service Error:", error);
    return {
      success: false,
      status: 500,
      message: "Internal Server Error",
      error: error.message,
    };
  }
};
