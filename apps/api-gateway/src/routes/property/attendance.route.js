import express from "express";
import {
  markAttendance,
  getAllAttendance,
  updateAttendance,
  getAllAttendanceSummary,
  getAvailableAttendanceDates,
} from "../../controllers/property/attendance.controller.js";

const attendanceRoutes = express.Router();

// Mark one or more attendance records
attendanceRoutes.post("/", markAttendance);

// Get all attendance records with filters
attendanceRoutes.get("/", getAllAttendance);

attendanceRoutes.get("/availableDates/:id", getAvailableAttendanceDates);

attendanceRoutes.get("/summary", getAllAttendanceSummary);

// Update a single attendance record
// attendanceRoutes.put("/:id", updateAttendance);

attendanceRoutes.put("/update", updateAttendance);

export default attendanceRoutes;
