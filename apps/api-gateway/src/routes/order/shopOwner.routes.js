import { Router } from "express";
import {
  forgotPassword,
  getShopOwnerProfile,
  loginShopOwner,
  logoutShopOwner,
  refreshToken,
  registerShopOwner,
  resetPassword,
  updateShopOwnerProfile,
} from "../../controllers/order/shopOwner.controller.js";
import { isAuthenticated } from "../../middleware/isAuthenticated.js";

const shopOwnerRoutes = Router();

shopOwnerRoutes.post("/register", registerShopOwner);
shopOwnerRoutes.post("/login", loginShopOwner);
shopOwnerRoutes.post("/refresh-token", refreshToken);
shopOwnerRoutes.post("/forgot-password", forgotPassword);
shopOwnerRoutes.post("/reset-password", resetPassword);

shopOwnerRoutes.use(isAuthenticated);
shopOwnerRoutes.get("/profile", getShopOwnerProfile);
shopOwnerRoutes.put("/profile", updateShopOwnerProfile);
shopOwnerRoutes.post("/logout", logoutShopOwner);

export default shopOwnerRoutes;
