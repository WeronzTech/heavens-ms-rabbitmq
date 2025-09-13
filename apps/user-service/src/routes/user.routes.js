import express from "express";
// import {
//   adminUpdateUser,
//   approveUser,
//   extendUserDays,
//   getHeavensUserById,
//   getUsersByRentType,
//   registerUser,
//   rejoinUser,
//   updateProfileCompletion,
//   vacateUser,
//   verifyEmail,
//   getUnapprovedUsers,
//   respondToStatusRequest,
//   createStatusRequest,
//   getUserStatusRequests,
//   getPendingStatusRequests,
//   handleBlockStatus,
//   getCheckOutedUsersByRentType,
//   getUserIds,
//   rejectUser,
//   getTodayCheckouts,
// } from "../controllers/user.controller.js";
// import { upload } from "../utils/imageOperation.js";

const router = express.Router();

//For Notification
// router.get("/push-notification", getUserIds);

// // Authentication
// router.post("/register", registerUser);
// router.get("/email/verify", verifyEmail);

// // Approval
// router.get("/pending-approvals", getUnapprovedUsers);
// router.put("/:id/approve", approveUser);
// router.delete("/:id/reject", rejectUser);

// // Stay Management
// router.put("/:id/vacate", vacateUser);
// router.put("/:id/rejoin", rejoinUser);
// router.put("/:id/extend", extendUserDays);

// // Daily Checkouts
// router.get("/checkouts", getTodayCheckouts);

// // Profile
// router.put(
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

// // User Management
// router.get("/", getUsersByRentType);
// router.get("/offBoarding", getCheckOutedUsersByRentType);
// // router.route("/:id").get(getHeavensUserById).put(adminUpdateUser);
// router
//   .route("/:id")
//   .get(getHeavensUserById)
//   .put(
//     upload.fields([
//       {name: "profileImg", maxCount: 1},
//       {name: "aadharFront", maxCount: 1},
//       {name: "aadharBack", maxCount: 1},
//     ]),
//     adminUpdateUser
//   );

// // Status Requests
// router
//   .route("/:id/status-requests")
//   .post(createStatusRequest)
//   .get(getUserStatusRequests);
// router.get("/status-requests/pending", getPendingStatusRequests);
// router.put("/:id/status-requests/:requestId/respond", respondToStatusRequest);
// router.put("/:id/block-status", handleBlockStatus);

export default router;
