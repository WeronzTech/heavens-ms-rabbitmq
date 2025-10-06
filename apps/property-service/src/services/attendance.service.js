import Attendance from "../models/attendance.model.js";
import { sendRPCRequest } from "../../../../libs/common/rabbitMq.js";
import { CLIENT_PATTERN } from "../../../../libs/patterns/client/client.pattern.js";
import moment from "moment";
import { PROPERTY_PATTERN } from "../../../../libs/patterns/property/property.pattern.js";

export const markAttendance = async (data) => {
  try {
    const { employeeId, employeeType, date, status, propertyId, remarks } =
      data;
    if (!employeeId || !employeeType || !date || !status || !propertyId) {
      return {
        success: false,
        status: 400,
        message: "Missing required fields.",
      };
    }

    const attendanceDate = moment(date).startOf("day").toDate();

    // Check for existing attendance for this employee on this date
    const existingAttendance = await Attendance.findOne({
      employeeId,
      date: attendanceDate,
    });
    if (existingAttendance) {
      return {
        success: false,
        status: 409,
        message: `Attendance for this employee has already been marked for ${moment(
          date
        ).format("YYYY-MM-DD")}.`,
      };
    }

    const newAttendance = await Attendance.create({
      employeeId,
      employeeType,
      date: attendanceDate,
      status,
      propertyId,
      remarks,
    });

    return {
      success: true,
      status: 201,
      message: "Attendance marked successfully.",
      data: newAttendance,
    };
  } catch (error) {
    console.error("Mark Attendance Service Error:", error);
    return {
      success: false,
      status: 500,
      message: "Internal Server Error",
      error: error.message,
    };
  }
};

export const getAllAttendance = async (filters) => {
  try {
    const { propertyId, date, employeeType } = filters;
    const query = {};

    if (propertyId) query.propertyId = propertyId;
    if (employeeType) query.employeeType = employeeType;
    if (date) {
      query.date = moment(date).startOf("day").toDate();
    }

    const attendanceRecords = await Attendance.find(query)
      .populate("propertyId", "propertyName")
      .lean();

    // Enrich with employee names from client-service
    const enrichedRecords = await Promise.all(
      attendanceRecords.map(async (record) => {
        let employeeName = "N/A";
        if (record.employeeType === "Manager") {
          // This pattern needs to exist in your client service
          const managerResponse = await sendRPCRequest(
            CLIENT_PATTERN.MANAGER.GET_MANAGER_BY_ID,
            { id: record.employeeId }
          );
          if (managerResponse.success) {
            employeeName = managerResponse.data.name;
          }
        } else if (record.employeeType === "Staff") {
          // This pattern needs to exist in your property service
          const staffResponse = await sendRPCRequest(
            PROPERTY_PATTERN.STAFF.GET_STAFF_BY_ID,
            { id: record.employeeId }
          );
          if (staffResponse.success) {
            employeeName = staffResponse.data.name;
          }
        }
        return { ...record, employeeName };
      })
    );

    return {
      success: true,
      status: 200,
      message: "Attendance records retrieved successfully.",
      data: enrichedRecords,
    };
  } catch (error) {
    console.error("Get All Attendance Service Error:", error);
    return {
      success: false,
      status: 500,
      message: "Internal Server Error",
      error: error.message,
    };
  }
};

export const updateAttendance = async (data) => {
  try {
    const { attendanceId, ...updateData } = data;
    const updatedAttendance = await Attendance.findByIdAndUpdate(
      attendanceId,
      updateData,
      { new: true }
    );
    if (!updatedAttendance) {
      return {
        success: false,
        status: 404,
        message: "Attendance record not found.",
      };
    }
    return {
      success: true,
      status: 200,
      message: "Attendance updated successfully.",
      data: updatedAttendance,
    };
  } catch (error) {
    console.error("Update Attendance Service Error:", error);
    return {
      success: false,
      status: 500,
      message: "Internal Server Error",
      error: error.message,
    };
  }
};
