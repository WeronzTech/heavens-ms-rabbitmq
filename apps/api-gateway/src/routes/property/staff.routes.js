import express from "express";
import {
  addStaff,
  deleteStaff,
  getAllStaff,
  getAllStaffForAttendance,
  getStaffById,
  getStaffByPropertyId,
  staffStatusChange,
  updateStaff,
} from "../../controllers/property/staff.controller.js";
import { upload } from "../../../../../libs/common/imageOperation.js";

const staffRoutes = express.Router();

staffRoutes.post(
  "/add",
  upload.fields([
    {
      name: "photo",
      maxCount: 1,
    },
    {
      name: "aadharFrontImage",
      maxCount: 1,
    },
    {
      name: "aadharBackImage",
      maxCount: 1,
    },
  ]),
  addStaff
);

staffRoutes.get("/getAll", getAllStaff);

staffRoutes.get("/:id", getStaffById);

staffRoutes.put("/status/:id", staffStatusChange);

staffRoutes.put(
  "/update/:id",
  upload.fields([
    {
      name: "photo",
      maxCount: 1,
    },
    {
      name: "aadharFrontImage",
      maxCount: 1,
    },
    {
      name: "aadharBackImage",
      maxCount: 1,
    },
  ]),
  updateStaff
);

staffRoutes.delete("/delete/:id", deleteStaff);
staffRoutes.get("/by-property/:propertyId", getStaffByPropertyId);
staffRoutes.get("/attendance/getAll", getAllStaffForAttendance);

export default staffRoutes;
