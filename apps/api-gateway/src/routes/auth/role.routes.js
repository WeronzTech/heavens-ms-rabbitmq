import express from "express";
import {
  createRole,
  deleteRole,
  getAllRoles,
  getRoleById,
  updateRole,
} from "../../controllers/auth/roles.controller.js";
import { isAuthenticated } from "../../middleware/isAuthenticated.js";
import { hasPermission } from "../../middleware/hasPermission.js";
import { PERMISSIONS } from "../../../../../libs/common/permissions.list.js";

const roleRoutes = express.Router();

roleRoutes.use(isAuthenticated);

roleRoutes.post("/", hasPermission(PERMISSIONS.ROLES_MANAGE), createRole);
roleRoutes.put("/:id", hasPermission(PERMISSIONS.ROLES_MANAGE), updateRole);
roleRoutes.delete("/:id", hasPermission(PERMISSIONS.ROLES_MANAGE), deleteRole);
roleRoutes.get("/", getAllRoles);
roleRoutes.get("/:id", getRoleById);

export default roleRoutes;
