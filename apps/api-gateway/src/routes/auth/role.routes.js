import express from "express";
import { createRole } from "../../controllers/auth/roles.controller.js";

const roleRoutes = express.Router();

roleRoutes.post("/", createRole);
// roleRoutes.put("/:id", updateRole);
// roleRoutes.delete("/:id", deleteRole);
// roleRoutes.get("/", getAllRoles);
// roleRoutes.get("/:id", getRoleById);

export default roleRoutes;
