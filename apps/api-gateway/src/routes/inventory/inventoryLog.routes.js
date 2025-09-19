import express from "express";
import { getInventoryLogs } from "../../controllers/inventory/inventoryLog.controller.js";

const inventoryLogRoutes = express.Router();

inventoryLogRoutes.get("/get", getInventoryLogs);

export default inventoryLogRoutes;
