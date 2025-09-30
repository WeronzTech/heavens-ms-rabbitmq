import express from "express";
import {
  adminUpdateUser,
  approveUser,
  createStatusRequest,
  extendUserDays,
  getAllPendingPayments,
  getCheckOutedUsersByRentType,
  getHeavensUserById,
  getPendingStatusRequests,
  getTodayCheckouts,
  getUnapprovedUsers,
  getUserIds,
  getUsersByRentType,
  getUserStatusRequests,
  getUsersWithBirthdayToday,
  handleBlockStatus,
  registerUser,
  rejectUser,
  rejoinUser,
  respondToStatusRequest,
  updateProfileCompletion,
  vacateUser,
  verifyEmail,
} from "../../controllers/user/user.controller.js";

const userRoutes = express.Router();

//For Notification
userRoutes.get("/push-notification", getUserIds);
userRoutes.get("/birthday", getUsersWithBirthdayToday);

// Authentication
userRoutes.post("/register", registerUser);
userRoutes.get("/email/verify", verifyEmail);

// Approval
userRoutes.get("/pending-approvals", getUnapprovedUsers);
userRoutes.put("/:id/approve", approveUser);
userRoutes.delete("/:id/reject", rejectUser);

// Stay Management
userRoutes.put("/:id/vacate", vacateUser);
userRoutes.put("/:id/rejoin", rejoinUser);
userRoutes.put("/:id/extend", extendUserDays);

// Daily Checkouts
userRoutes.get("/checkouts", getTodayCheckouts);

// Profile
userRoutes.put("/:id/profile-completion", updateProfileCompletion);
// userRoutes.put(
//   "/:id/profile-completion",
//   upload.fields([
//     {
//       name: "profileImg",
//       maxCount: 1,
//     },
//     {
//       name: "aadharFront",
//       maxCount: 1,
//     },
//     {
//       name: "aadharBack",
//       maxCount: 1,
//     },
//   ]),
//   updateProfileCompletion
// );

// User Management
userRoutes.get("/", getUsersByRentType);
userRoutes.get("/pending-payments", getAllPendingPayments);
userRoutes.get("/offBoarding", getCheckOutedUsersByRentType);

// userRoutes
//   .route("/:id")
//   .get(getHeavensUserById)
//   .put(
//     upload.fields([
//       { name: "profileImg", maxCount: 1 },
//       { name: "aadharFront", maxCount: 1 },
//       { name: "aadharBack", maxCount: 1 },
//     ]),
//     adminUpdateUser
//   );

userRoutes.route("/:id").get(getHeavensUserById).put(adminUpdateUser);

// Status Requests
userRoutes
  .route("/:id/status-requests")
  .post(createStatusRequest)
  .get(getUserStatusRequests);
userRoutes.get("/status-requests/pending", getPendingStatusRequests);
userRoutes.put(
  "/:id/status-requests/:requestId/respond",
  respondToStatusRequest
);
userRoutes.put("/:id/block-status", handleBlockStatus);

export default userRoutes;
