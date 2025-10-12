import Attendance from "../models/attendance.model.js";
import moment from "moment";
import { sendRPCRequest } from "../../../../libs/common/rabbitMq.js";
import { CLIENT_PATTERN } from "../../../../libs/patterns/client/client.pattern.js";
import { PROPERTY_PATTERN } from "../../../../libs/patterns/property/property.pattern.js";
import mongoose from "mongoose";

export const markAttendance = async (data) => {
  try {
    const {
      employeeId,
      employeeName,
      employeeType,
      date,
      status,
      propertyId,
      remarks,
    } = data;

    if (
      !employeeId ||
      !employeeName ||
      !employeeType ||
      !date ||
      !status ||
      !propertyId
    ) {
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
        employeeName,
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

export const getAllAttendanceSummary = async (data) => {
  try {
    const {
      propertyId,
      employeeType,
      employeeId,
      date,
      month,
      year,
      searchText,
    } = data;

    const query = {};

    // ✅ Filter by propertyId (array field)
    if (propertyId) {
      query.propertyId = { $in: [new mongoose.Types.ObjectId(propertyId)] };
    }

    if (employeeType) query.employeeType = employeeType;
    if (employeeId) query.employeeId = employeeId;

    // ✅ Handle month & year
    if (month && year) {
      const startOfMonth = moment(`${year}-${month}-01`)
        .startOf("month")
        .toDate();
      const endOfMonth = moment(`${year}-${month}-01`).endOf("month").toDate();
      query.date = { $gte: startOfMonth, $lte: endOfMonth };
    }

    // 🧮 Aggregation pipeline
    const summary = await Attendance.aggregate([
      { $match: query },

      // ✅ Optionally filter by employeeName (case-insensitive)
      ...(searchText
        ? [
            {
              $match: {
                employeeName: { $regex: searchText, $options: "i" },
              },
            },
          ]
        : []),

      {
        $group: {
          _id: {
            employeeId: "$employeeId",
            employeeType: "$employeeType",
          },
          employeeName: { $first: "$employeeName" },
          totalPresent: {
            $sum: { $cond: [{ $eq: ["$status", "Present"] }, 1, 0] },
          },
          totalAbsent: {
            $sum: { $cond: [{ $eq: ["$status", "Absent"] }, 1, 0] },
          },
          totalLeave: {
            $sum: { $cond: [{ $eq: ["$status", "Paid Leave"] }, 1, 0] },
          },
          totalHalfDay: {
            $sum: { $cond: [{ $eq: ["$status", "Half Day"] }, 1, 0] },
          },
          records: { $push: "$$ROOT" },
        },
      },
      { $sort: { "_id.employeeId": 1 } },
    ]);

    // ✅ Compute selected date status
    const enrichedRecords = summary.map((item) => {
      let selectedDateStatus = "Not Marked";

      if (date) {
        const selected = moment.utc(date).startOf("day");
        const foundRecord = item.records.find((r) =>
          moment.utc(r.date).isSame(selected, "day")
        );
        if (foundRecord) selectedDateStatus = foundRecord.status;
      }

      return {
        employeeId: item._id.employeeId,
        employeeName: item.employeeName || "N/A",
        employeeType: item._id.employeeType,
        totalPresentDays: item.totalPresent,
        totalAbsentDays: item.totalAbsent,
        totalLeaveDays: item.totalLeave,
        totalHalfDays: item.totalHalfDay,
        selectedDateStatus,
      };
    });

    return {
      success: true,
      status: 200,
      message: "Attendance summary retrieved successfully.",
      data: enrichedRecords,
    };
  } catch (error) {
    console.error("Attendance Summary Error:", error);
    return {
      success: false,
      status: 500,
      message: "Internal Server Error",
      error: error.message,
    };
  }
};

export const getAvailableAttendanceDates = async (data) => {
  try {
    const { employeeId } = data;

    if (!employeeId) {
      return {
        success: false,
        status: 400,
        message: "employeeId is required",
      };
    }

    // Ensure employeeId is ObjectId
    const empId = new mongoose.Types.ObjectId(employeeId);

    // Fetch all attendance records for this employee
    const records = await Attendance.find({ employeeId: empId })
      .select("date status -_id") // ✅ include both date and status
      .sort({ date: 1 })
      .lean();

    if (!records.length) {
      return {
        success: true,
        status: 200,
        message: "No attendance records found for this employee",
        data: [],
      };
    }

    // ✅ Map each record to { date, status } with formatted date
    const formattedRecords = records.map((r) => ({
      date: moment(r.date).format("YYYY-MM-DD"),
      status: r.status || "Not Marked",
    }));

    // ✅ Remove duplicate dates (keep the latest record if duplicates exist)
    const uniqueRecordsMap = new Map();
    formattedRecords.forEach((rec) => {
      uniqueRecordsMap.set(rec.date, rec.status);
    });

    const uniqueRecords = Array.from(uniqueRecordsMap, ([date, status]) => ({
      date,
      status,
    }));

    return {
      success: true,
      status: 200,
      message: "Available attendance dates retrieved successfully",
      data: uniqueRecords,
    };
  } catch (error) {
    console.error("Get Available Attendance Dates Error:", error);
    return {
      success: false,
      status: 500,
      message: "Internal Server Error",
      error: error.message,
    };
  }
};

export const updateAttendanceUsingDate = async (data) => {
  try {
    const { employeeId, date, ...updateData } = data;
    console.log("hererere daterrere");
    console.log(data);

    if (!employeeId || !date) {
      return {
        success: false,
        status: 400,
        message: "Both employeeId and date are required.",
      };
    }

    // Ensure employeeId is a valid ObjectId
    const empId = new mongoose.Types.ObjectId(employeeId);

    // Find and update the record based on employeeId + date
    const updatedRecord = await Attendance.findOneAndUpdate(
      {
        employeeId: empId,
        date: {
          $gte: moment.utc(date).startOf("day").toDate(),
          $lte: moment.utc(date).endOf("day").toDate(),
        },
      },
      updateData,
      { new: true }
    );

    if (!updatedRecord) {
      return {
        success: false,
        status: 404,
        message: "Attendance record not found for the given date.",
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
