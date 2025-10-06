import express from "express";
import {
  markAttendance,
  getAllAttendance,
  updateAttendance,
} from "../../controllers/property/attendance.controller.js";

const attendanceRoutes = express.Router();

// Mark one or more attendance records
attendanceRoutes.post("/", markAttendance);

// Get all attendance records with filters
attendanceRoutes.get("/", getAllAttendance);

// Update a single attendance record
attendanceRoutes.put("/:id", updateAttendance);

export default attendanceRoutes;
