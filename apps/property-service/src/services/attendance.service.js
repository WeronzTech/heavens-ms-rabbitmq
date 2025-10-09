import Attendance from "../models/attendance.model.js";
import moment from "moment";
import mongoose from "mongoose";
import { sendRPCRequest } from "../../../../libs/common/rabbitMq.js";
import { CLIENT_PATTERN } from "../../../../libs/patterns/client/client.pattern.js";
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

    const newAttendance = await Attendance.findOneAndUpdate(
      { employeeId, date: attendanceDate },
      {
        employeeType,
        status,
        propertyId,
        remarks,
      },
      { new: true, upsert: true, runValidators: true }
    );

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
    const { propertyId, date, employeeType, employeeId, startDate, endDate } =
      filters;
    const query = {};

    if (propertyId) query.propertyId = propertyId;
    if (employeeType) query.employeeType = employeeType;
    if (employeeId) query.employeeId = employeeId;

    // ✅ FIXED: Now correctly handles a date range
    if (startDate && endDate) {
      query.date = {
        $gte: moment(startDate).startOf("day").toDate(),
        $lte: moment(endDate).endOf("day").toDate(),
      };
    } else if (date) {
      query.date = moment(date).startOf("day").toDate();
    }

    const attendanceRecords = await Attendance.find(query)
      .populate("propertyId", "propertyName")
      .lean();

    const enrichedRecords = await Promise.all(
      attendanceRecords.map(async (record) => {
        let employeeName = "N/A";
        let employeeResponse;
        if (record.employeeType === "Manager") {
          employeeResponse = await sendRPCRequest(
            CLIENT_PATTERN.MANAGER.GET_MANAGER_BY_ID,
            { id: record.employeeId }
          );
        } else if (record.employeeType === "Staff") {
          employeeResponse = await sendRPCRequest(
            PROPERTY_PATTERN.STAFF.GET_STAFF_BY_ID,
            { id: record.employeeId }
          );
        }
        if (employeeResponse && employeeResponse.success) {
          employeeName = employeeResponse.data.name;
        }
        return { ...record, employeeName };
      })
    );

    return {
      success: true,
      status: 200,
      message: "Attendance records retrieved successfully.",
      data: { data: enrichedRecords }, // Match expected structure from cron job
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
    const updatedRecord = await Attendance.findByIdAndUpdate(
      attendanceId,
      updateData,
      { new: true }
    );
    if (!updatedRecord) {
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
      data: updatedRecord,
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
