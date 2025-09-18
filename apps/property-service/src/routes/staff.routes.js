import express from "express";
// import authMiddleware from "../middleware/auth.middileware.js";
// import {
//   addStaff,
//   deleteStaff,
//   getAllStaff,
//   getStaffById,
//   getStaffByPropertyId,
//   staffStatusChange,
//   updateStaff,
// } from "../controllers/staff.controller.js";
// import { upload } from "../utils/imageOperation.js";

const router = express.Router();

// router.post(
//   "/add",
//   upload.fields([
//     {
//       name: "photo",
//       maxCount: 1,
//     },
//     {
//       name: "aadharFrontImage",
//       maxCount: 1,
//     },
//     {
//       name: "aadharBackImage",
//       maxCount: 1,
//     },
//   ]),
//   addStaff
// );

// router.get("/getAll", getAllStaff);

// router.get("/:id", getStaffById);

// router.put("/status/:id", staffStatusChange);

// router.put(
//   "/update/:id",
//   upload.fields([
//     {
//       name: "photo",
//       maxCount: 1,
//     },
//     {
//       name: "aadharFrontImage",
//       maxCount: 1,
//     },
//     {
//       name: "aadharBackImage",
//       maxCount: 1,
//     },
//   ]),
//   updateStaff
// );

// router.delete("/delete/:id", deleteStaff);
// router.get("/by-property/:propertyId", getStaffByPropertyId);

export default router;
