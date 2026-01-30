import express from "express";
import {
  registerManager,
  getManagerByEmail,
  validateManagerCredentials,
  forgotPasswordManager,
  resetPasswordManager,
  getAllManagers,
  editManager,
  changeManagerStatus,
  deleteManager,
  getManagerById,
} from "../../controllers/client/manager.controller.js";
import { upload } from "../../../../../libs/common/imageOperation.js";
import { isAuthenticated } from "../../middleware/isAuthenticated.js";
import { hasPermission } from "../../middleware/hasPermission.js";
import { PERMISSIONS } from "../../../../../libs/common/permissions.list.js";

const managerRoutes = express.Router();

managerRoutes.post(
  "/register",
  upload.fields([
    {
      name: "photo",
      maxCount: 1,
    },
    {
      name: "aadharImage",
      maxCount: 1,
    },
    {
      name: "panCardImage",
      maxCount: 1,
    },
  ]),
  registerManager,
);

managerRoutes.post("/login", validateManagerCredentials);
managerRoutes.post("/forgot-password", forgotPasswordManager);
managerRoutes.post("/reset-password/:token", resetPasswordManager);
managerRoutes.post("/by-email", getManagerByEmail);

managerRoutes.use(isAuthenticated);

managerRoutes.get("/", getAllManagers);

managerRoutes.get("/:id", getManagerById);

managerRoutes.put(
  "/edit/:id",
  upload.fields([
    {
      name: "photo",
      maxCount: 1,
    },
    {
      name: "aadharImage",
      maxCount: 1,
    },
    {
      name: "panCardImage",
      maxCount: 1,
    },
  ]),
  editManager,
);

managerRoutes.put("/status/:id", changeManagerStatus);

managerRoutes.delete("/delete/:id", deleteManager);

export default managerRoutes;
