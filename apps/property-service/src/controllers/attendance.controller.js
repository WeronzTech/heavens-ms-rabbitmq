import { createResponder } from "../../../../libs/common/rabbitMq.js";
import { PROPERTY_PATTERN } from "../../../../libs/patterns/property/property.pattern.js";
import {
  markAttendance,
  getAllAttendance,
  // updateAttendance,
  getAllAttendanceSummary,
  getAvailableAttendanceDates,
  updateAttendanceUsingDate,
} from "../services/attendance.service.js";

createResponder(PROPERTY_PATTERN.ATTENDANCE.MARK_ATTENDANCE, async (data) => {
  return await markAttendance(data);
});

createResponder(PROPERTY_PATTERN.ATTENDANCE.GET_ATTENDANCE, async (data) => {
  return await getAllAttendance(data);
});

// createResponder(PROPERTY_PATTERN.ATTENDANCE.UPDATE_ATTENDANCE, async (data) => {
//   return await updateAttendance(data);
// });

createResponder(
  PROPERTY_PATTERN.ATTENDANCE.GET_ATTENDANCE_SUMMARY,
  async (data) => {
    return await getAllAttendanceSummary(data);
  }
);

createResponder(
  PROPERTY_PATTERN.ATTENDANCE.GET_AVAILABLE_ATTENDANCE_DATE,
  async (data) => {
    return await getAvailableAttendanceDates(data);
  }
);

createResponder(PROPERTY_PATTERN.ATTENDANCE.UPDATE_ATTENDANCE, async (data) => {
  return await updateAttendanceUsingDate(data);
});
