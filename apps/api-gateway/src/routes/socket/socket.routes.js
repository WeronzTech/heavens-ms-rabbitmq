import express from "express";
import {
  createPermission,
  deletePermission,
  getAllPermissions,
  getPermissionById,
  emitEvent,
  updatePermission,
} from "../../controllers/socket/socket.controller.js";

const socketRoutes = express.Router();

// Internal route: Get students by propertyId
socketRoutes.post("/emit", emitEvent);
socketRoutes.get("/", getAllPermissions);
socketRoutes.post("/", createPermission);
socketRoutes.get("/:id", getPermissionById);
socketRoutes.put("/:id", updatePermission);
socketRoutes.delete("/:id", deletePermission);

export default socketRoutes;
