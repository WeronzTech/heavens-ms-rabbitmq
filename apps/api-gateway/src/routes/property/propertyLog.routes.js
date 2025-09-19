import express from "express";
import { getActivityLogsController } from "../../controllers/property/log.controller.js";

const propertyLogRoutes = express.Router();

propertyLogRoutes.get("/get", getActivityLogsController);

export default propertyLogRoutes;
