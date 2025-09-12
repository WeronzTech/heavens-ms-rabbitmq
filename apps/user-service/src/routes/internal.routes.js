import express from "express";
import {verifyInternalKey} from "../middleware/verifyInternalKey.js";
import {
  getUserAuthData,
  getStudentsByPropertyId,
  getRoomOccupants,
  getResidentCounts,
} from "../controllers/internal.controller.js";

const router = express.Router();

// Internal route: Get students by propertyId
router.get(
  "/students/by-property/:propertyId",
  verifyInternalKey,
  getStudentsByPropertyId
);

router.get("/auth-data/:identifier", getUserAuthData);
router.get("/user-data/:roomId", getRoomOccupants);
router.get("/residents/counts", getResidentCounts);

export default router;
