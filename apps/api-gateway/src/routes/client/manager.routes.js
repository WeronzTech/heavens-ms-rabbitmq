import express from "express";
import {
  registerManager,
  getManagerByEmail,
  validateManagerCredentials,
  forgotPasswordManager,
  resetPasswordManager,
  getAllManagers,
  editManager,
  //   getManagerById,
  changeManagerStatus,
  deleteManager,
  getManagerById,
} from "../../controllers/client/manager.controller.js";
import { upload } from "../../../../../libs/common/imageOperation.js";

const managerRoutes = express.Router();

managerRoutes.get("/", getAllManagers);

managerRoutes.get("/:id", getManagerById);

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
  ]),
  registerManager
);

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
  ]),
  editManager
);

managerRoutes.put("/status/:id", changeManagerStatus);

managerRoutes.delete("/delete/:id", deleteManager);

managerRoutes.post("/login", validateManagerCredentials);

managerRoutes.post("/forgot-password", forgotPasswordManager);

managerRoutes.post("/reset-password/:token", resetPasswordManager);

managerRoutes.post("/by-email", getManagerByEmail);

export default managerRoutes;
