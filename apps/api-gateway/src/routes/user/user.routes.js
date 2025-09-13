import express from "express";
import {
  approveUser,
  getUnapprovedUsers,
  registerUser,
} from "../../controllers/user/user.controller.js";

const userRoutes = express.Router();

userRoutes.post("/register", registerUser);

// Approval
userRoutes.get("/pending-approvals", getUnapprovedUsers);
userRoutes.put("/:id/approve", approveUser);

export default userRoutes;
