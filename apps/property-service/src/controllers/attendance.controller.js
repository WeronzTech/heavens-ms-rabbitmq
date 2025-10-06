import { createResponder } from "../../../../libs/common/rabbitMq.js";
import { PROPERTY_PATTERN } from "../../../../libs/patterns/property/property.pattern.js";
import {
  markAttendance,
  getAllAttendance,
  updateAttendance,
} from "../services/attendance.service.js";

createResponder(PROPERTY_PATTERN.ATTENDANCE.MARK_ATTENDANCE, async (data) => {
  return await markAttendance(data);
});

createResponder(PROPERTY_PATTERN.ATTENDANCE.GET_ATTENDANCE, async (data) => {
  return await getAllAttendance(data);
});

createResponder(PROPERTY_PATTERN.ATTENDANCE.UPDATE_ATTENDANCE, async (data) => {
  return await updateAttendance(data);
});
