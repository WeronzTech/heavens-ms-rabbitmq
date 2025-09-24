import express from "express";
import { getActivityLogs } from "../../controllers/user/userLog.controller.js";

const userLogRoutes = express.Router();

userLogRoutes.get("/activityLogs", getActivityLogs);

export default userLogRoutes;
