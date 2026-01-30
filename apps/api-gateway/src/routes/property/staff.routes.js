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
import { isAuthenticated } from "../../middleware/isAuthenticated.js";
import { hasPermission } from "../../middleware/hasPermission.js";
import { PERMISSIONS } from "../../../../../libs/common/permissions.list.js";

const staffRoutes = express.Router();

staffRoutes.use(isAuthenticated);

staffRoutes.post(
  "/add",
  hasPermission(PERMISSIONS.EMPLOYEE_MANAGE),
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
    {
      name: "panCardImage",
      maxCount: 1,
    },
  ]),
  addStaff,
);

staffRoutes.get("/getAll", hasPermission(PERMISSIONS.STAFF_VIEW), getAllStaff);

staffRoutes.get("/:id", hasPermission(PERMISSIONS.STAFF_VIEW), getStaffById);

staffRoutes.put(
  "/status/:id",
  hasPermission(PERMISSIONS.EMPLOYEE_MANAGE),
  staffStatusChange,
);

staffRoutes.put(
  "/update/:id",
  hasPermission(PERMISSIONS.EMPLOYEE_MANAGE),
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
    {
      name: "panCardImage",
      maxCount: 1,
    },
  ]),
  updateStaff,
);

staffRoutes.get("/attendance/getAll", getAllStaffForAttendance);

staffRoutes.delete(
  "/delete/:id",
  hasPermission(PERMISSIONS.EMPLOYEE_MANAGE),
  deleteStaff,
);

staffRoutes.get(
  "/by-property/:propertyId",
  hasPermission(PERMISSIONS.STAFF_VIEW),
  getStaffByPropertyId,
);

export default staffRoutes;
