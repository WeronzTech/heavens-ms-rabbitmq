import { sendRPCRequest } from "../../../../../libs/common/rabbitMq.js";
import { PROPERTY_PATTERN } from "../../../../../libs/patterns/property/property.pattern.js";

const handleRPCAndRespond = async (res, pattern, data) => {
  try {
    const response = await sendRPCRequest(pattern, data);
    return res.status(response.status || 500).json(response);
  } catch (error) {
    console.error(`API Gateway Error in ${pattern}:`, error);
    return res
      .status(500)
      .json({ message: "Internal Server Error in API Gateway." });
  }
};

export const markAttendance = (req, res) =>
  handleRPCAndRespond(
    res,
    PROPERTY_PATTERN.ATTENDANCE.MARK_ATTENDANCE,
    req.body
  );

export const getAllAttendance = (req, res) =>
  handleRPCAndRespond(
    res,
    PROPERTY_PATTERN.ATTENDANCE.GET_ATTENDANCE,
    req.query
  );

// export const updateAttendance = (req, res) =>
//   handleRPCAndRespond(res, PROPERTY_PATTERN.ATTENDANCE.UPDATE_ATTENDANCE, {
//     ...req.body,
//     attendanceId: req.params.id,
//   });

export const getAllAttendanceSummary = (req, res) =>
  handleRPCAndRespond(
    res,
    PROPERTY_PATTERN.ATTENDANCE.GET_ATTENDANCE_SUMMARY,
    req.query
  );

export const getAvailableAttendanceDates = (req, res) =>
  handleRPCAndRespond(
    res,
    PROPERTY_PATTERN.ATTENDANCE.GET_AVAILABLE_ATTENDANCE_DATE,
    {
      employeeId: req.params.id,
    }
  );

export const updateAttendance = (req, res) =>
  handleRPCAndRespond(res, PROPERTY_PATTERN.ATTENDANCE.UPDATE_ATTENDANCE, {
    ...req.body,
  });
