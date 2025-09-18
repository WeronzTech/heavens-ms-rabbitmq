import express from "express";
import { deleteStaff, getAllStaff, getStaffById, getStaffByPropertyId, staffStatusChange } from "../../controllers/property/staff.controller.js";
// import { getAllStaff } from "../../controllers/property/staff.controller";
// import authMiddleware from "../middleware/auth.middileware.js";

// import { upload } from "../utils/imageOperation.js";

const staffRoutes = express.Router();

// staffRoutes.post(
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

 staffRoutes.get("/getAll", getAllStaff);

 staffRoutes.get("/:id", getStaffById);

staffRoutes.put("/status/:id", staffStatusChange);

// staffRoutes.put(
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

staffRoutes.delete("/delete/:id", deleteStaff);
staffRoutes.get("/by-property/:propertyId", getStaffByPropertyId);

export default staffRoutes;
