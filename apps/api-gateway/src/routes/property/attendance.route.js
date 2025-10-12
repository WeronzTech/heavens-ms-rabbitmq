import express from "express";
import {
  markAttendance,
  getAllAttendance,
  updateAttendance,
  getAllAttendanceSummary,
  getAvailableAttendanceDates,
} from "../../controllers/property/attendance.controller.js";
import { isAuthenticated } from "../../middleware/isAuthenticated.js";
import { hasPermission } from "../../middleware/hasPermission.js";
import { PERMISSIONS } from "../../../../../libs/common/permissions.list.js";

const attendanceRoutes = express.Router();

attendanceRoutes.use(isAuthenticated);

// Mark one or more attendance records
attendanceRoutes.post(
  "/",
  hasPermission(PERMISSIONS.ATTENDANCE_MANAGE),
  markAttendance
);

// Get all attendance records with filters
attendanceRoutes.get(
  "/",
  hasPermission(PERMISSIONS.ATTENDANCE_VIEW),
  getAllAttendance
);

attendanceRoutes.get("/availableDates/:id", getAvailableAttendanceDates);

attendanceRoutes.get("/summary", getAllAttendanceSummary);

// Update a single attendance record
// attendanceRoutes.put("/:id", updateAttendance);

// attendanceRoutes.put("/update", updateAttendance);
// attendanceRoutes.put(
//   "/:id",
//   hasPermission(PERMISSIONS.ATTENDANCE_MANAGE),
//   updateAttendance
// );
attendanceRoutes.put(
  "/update",
  hasPermission(PERMISSIONS.ATTENDANCE_MANAGE),
  updateAttendance
);

export default attendanceRoutes;
