import express from "express";
import {
  approveClient,
  forgotPassword,
  getClientByEmail,
  registerAdmin,
  registerClient,
  resetPassword,
  validateClientCredentials,
  verifyEmail,
} from "../../controllers/client/client.controller.js";

const clientRoutes = express.Router();

clientRoutes.post("/register-admin", registerAdmin);
clientRoutes.post("/register-client", registerClient);
clientRoutes.post("/getClientByEmail", getClientByEmail);
clientRoutes.post("/login", validateClientCredentials);
clientRoutes.post("/forgot-password", forgotPassword);
clientRoutes.post("/reset-password/:token", resetPassword);
clientRoutes.post("/verify-email/:token", verifyEmail);
clientRoutes.post("/approveClient", approveClient);

export default clientRoutes;
