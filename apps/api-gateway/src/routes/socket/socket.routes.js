import express from "express";
import {
  createPermission,
  deletePermission,
  getAllPermissions,
  getPermissionById,
  emitEvent,
  updatePermission,
} from "../../controllers/socket/socket.controller.js";
import { isAuthenticated } from "../../middleware/isAuthenticated.js";
import { hasPermission } from "../../middleware/hasPermission.js";
import { PERMISSIONS } from "../../../../../libs/common/permissions.list.js";

const socketRoutes = express.Router();

socketRoutes.use(isAuthenticated);

// Internal route: Get students by propertyId
socketRoutes.post("/emit", emitEvent);

socketRoutes.use(hasPermission(PERMISSIONS.SOCKET_MANAGE));

socketRoutes.get("/", getAllPermissions);
socketRoutes.post("/", createPermission);
socketRoutes.get("/:id", getPermissionById);
socketRoutes.put("/:id", updatePermission);
socketRoutes.delete("/:id", deletePermission);

export default socketRoutes;
