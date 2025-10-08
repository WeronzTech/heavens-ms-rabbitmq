import { Router } from "express";
import {
  getReferralSettings,
  getUserReferralDetails,
  updateReferralSettings,
} from "../../controllers/user/referral.controller.js";
import { isAuthenticated } from "../../middleware/isAuthenticated.js";

const referralRoutes = Router();

// Allows the logged-in user to get their own referral code and status
referralRoutes.get("/details", isAuthenticated, getUserReferralDetails);

referralRoutes
  .route("/settings")
  .get(isAuthenticated, getReferralSettings)
  .put(isAuthenticated, updateReferralSettings);

export default referralRoutes;
