import express from "express";
import { getDashboardStats } from "../../controllers/property/dashboard.controller.js";

const dashboardRoutes = express.Router();

dashboardRoutes.get("/stats", getDashboardStats);

export default dashboardRoutes;
