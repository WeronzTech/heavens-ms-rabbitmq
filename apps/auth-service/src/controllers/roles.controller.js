import { createResponder } from "../../../../libs/common/rabbitMq.js";
import { AUTH_PATTERN } from "../../../../libs/patterns/auth/auth.pattern.js";
import {
  createRole,
  deleteRole,
  getAllRoles,
  getRoleById,
  getRoleName,
  updateRole,
} from "../services/role.service.js";

createResponder(AUTH_PATTERN.ROLE.CREATE_ROLE, async (data) => {
  return await createRole(data);
});

createResponder(AUTH_PATTERN.ROLE.GET_ROLE_NAME, async (data) => {
  return await getRoleName(data);
});

createResponder(AUTH_PATTERN.ROLE.UPDATE_ROLE, async (data) => {
  return await updateRole(data);
});

createResponder(AUTH_PATTERN.ROLE.DELETE_ROLE, async (data) => {
  return await deleteRole(data);
});

createResponder(AUTH_PATTERN.ROLE.GET_ALL_ROLES, async () => {
  return await getAllRoles();
});

createResponder(AUTH_PATTERN.ROLE.GET_ROLE_BY_ID, async (data) => {
  return await getRoleById(data);
});

// // Get All Roles
// export const getAllRoles = async (req, res) => {
//   try {
//     const roles = await Role.find().populate("reportTo", "roleName");

//     res.json({ success: true, data: roles });
//   } catch (error) {
//     res.status(500).json({ success: false, message: error.message });
//   }
// };

// // Get Single Role by ID
// export const getRoleById = async (req, res) => {
//   try {
//     const { id } = req.params;

//     const role = await Role.findById(id).populate("reportTo", "roleName");

//     if (!role) {
//       return res
//         .status(404)
//         .json({ success: false, message: "Role not found" });
//     }

//     res.json({ success: true, data: role });
//   } catch (error) {
//     res.status(500).json({ success: false, message: error.message });
//   }
// };
