import express from "express";
import {
  adminUpdateUser,
  approveUser,
  createStatusRequest,
  extendUserDays,
  getAllPendingDeposits,
  getAllPendingPayments,
  getCheckOutedUsersByRentType,
  getHeavensUserById,
  getPendingStatusRequests,
  getTodayCheckouts,
  getUnapprovedUsers,
  getUserIds,
  getUsersByAgencyController,
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
import { upload } from "../../../../../libs/common/imageOperation.js";
import { isAuthenticated } from "../../middleware/isAuthenticated.js";
import { hasPermission } from "../../middleware/hasPermission.js";
import { PERMISSIONS } from "../../../../../libs/common/permissions.list.js";

const userRoutes = express.Router();

//For Notification
userRoutes.get(
  "/push-notification",
  isAuthenticated,
  hasPermission(PERMISSIONS.USER_VIEW),
  getUserIds
);
userRoutes.get(
  "/birthday",
  isAuthenticated,
  hasPermission(PERMISSIONS.USER_VIEW),
  getUsersWithBirthdayToday
);

// Authentication
userRoutes.post("/register", registerUser);
userRoutes.get("/email/verify", verifyEmail);

userRoutes.use(isAuthenticated);

// Approval
userRoutes.get(
  "/pending-approvals",
  hasPermission(PERMISSIONS.USER_APPROVAL),
  getUnapprovedUsers
);
userRoutes.put(
  "/:id/approve",
  hasPermission(PERMISSIONS.USER_APPROVAL),
  approveUser
);
userRoutes.delete(
  "/:id/reject",
  hasPermission(PERMISSIONS.USER_APPROVAL),
  rejectUser
);

// Stay Management
userRoutes.put(
  "/:id/vacate",
  hasPermission(PERMISSIONS.USER_MANAGE),
  vacateUser
);
userRoutes.put(
  "/:id/rejoin",
  hasPermission(PERMISSIONS.USER_MANAGE),
  rejoinUser
);
userRoutes.put(
  "/:id/extend",
  hasPermission(PERMISSIONS.USER_MANAGE),
  extendUserDays
);

// Daily Checkouts
userRoutes.get(
  "/checkouts",
  hasPermission(PERMISSIONS.USER_VIEW),
  getTodayCheckouts
);

// Profile
userRoutes.put(
  "/:id/profile-completion",
  hasPermission(PERMISSIONS.USER_MANAGE),
  upload.fields([
    {
      name: "profileImg",
      maxCount: 1,
    },
    {
      name: "aadharFront",
      maxCount: 1,
    },
    {
      name: "aadharBack",
      maxCount: 1,
    },
  ]),
  updateProfileCompletion
);

// User Management
userRoutes.get("/", hasPermission(PERMISSIONS.USER_VIEW), getUsersByRentType);
userRoutes.get(
  "/pending-payments",
  hasPermission(PERMISSIONS.USER_VIEW),
  getAllPendingPayments
);
userRoutes.get(
  "/pending-deposits",
  hasPermission(PERMISSIONS.USER_VIEW),
  getAllPendingDeposits
);
userRoutes.get(
  "/offBoarding",
  hasPermission(PERMISSIONS.USER_VIEW),
  getCheckOutedUsersByRentType
);
userRoutes.get(
  "/byAgency",
  hasPermission(PERMISSIONS.USER_VIEW),
  getUsersByAgencyController
);

userRoutes
  .route("/:id")
  .get(hasPermission(PERMISSIONS.USER_VIEW), getHeavensUserById)
  .put(
    hasPermission(PERMISSIONS.USER_MANAGE),
    upload.fields([
      { name: "profileImg", maxCount: 1 },
      { name: "aadharFront", maxCount: 1 },
      { name: "aadharBack", maxCount: 1 },
    ]),
    adminUpdateUser
  );

// Status Requests
userRoutes
  .route("/:id/status-requests")
  .post(hasPermission(PERMISSIONS.USER_STATUS_MANAGE), createStatusRequest)
  .get(hasPermission(PERMISSIONS.USER_STATUS_MANAGE), getUserStatusRequests);
userRoutes.get(
  "/status-requests/pending",
  hasPermission(PERMISSIONS.USER_STATUS_MANAGE),
  getPendingStatusRequests
);
userRoutes.put(
  "/:id/status-requests/:requestId/respond",
  hasPermission(PERMISSIONS.USER_STATUS_MANAGE),
  respondToStatusRequest
);
userRoutes.put(
  "/:id/block-status",
  hasPermission(PERMISSIONS.USER_STATUS_MANAGE),
  handleBlockStatus
);

export default userRoutes;
