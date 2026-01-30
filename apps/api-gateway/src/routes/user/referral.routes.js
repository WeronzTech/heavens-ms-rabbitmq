import { Router } from "express";
import {
  getReferralSettings,
  getUserReferralDetails,
  updateReferralSettings,
} from "../../controllers/user/referral.controller.js";
import { isAuthenticated } from "../../middleware/isAuthenticated.js";
import { hasPermission } from "../../middleware/hasPermission.js";
import { PERMISSIONS } from "../../../../../libs/common/permissions.list.js";

const referralRoutes = Router();

// Allows the logged-in user to get their own referral code and status
referralRoutes.get("/details", isAuthenticated, getUserReferralDetails);

referralRoutes
  .route("/settings")
  .get(
    isAuthenticated,
    hasPermission(PERMISSIONS.REFERRAL_MANAGE),
    getReferralSettings,
  )
  .put(
    isAuthenticated,
    hasPermission(PERMISSIONS.REFERRAL_MANAGE),
    updateReferralSettings,
  );

export default referralRoutes;
