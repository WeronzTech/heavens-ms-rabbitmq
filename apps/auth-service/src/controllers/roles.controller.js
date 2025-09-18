import { createResponder } from "../../../../libs/common/rabbitMq.js";
import { AUTH_PATTERN } from "../../../../libs/patterns/auth/auth.pattern.js";
import { createRole, getRoleByName } from "../services/role.service.js";

createResponder(AUTH_PATTERN.ROLE.CREATE_ROLE, async (data) => {
  return await createRole(data);
});

createResponder(AUTH_PATTERN.ROLE.GET_ROLE_BY_NAME, async (data) => {
  return await getRoleByName(data);
});

// // Edit Role
// export const updateRole = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { roleName, permissions, reportTo } = req.body;

//     const updatedRole = await Role.findByIdAndUpdate(
//       id,
//       { roleName, permissions, reportTo },
//       { new: true }
//     );

//     if (!updatedRole) {
//       return res
//         .status(404)
//         .json({ success: false, message: "Role not found" });
//     }

//     res.json({ success: true, data: updatedRole });
//   } catch (error) {
//     res.status(500).json({ success: false, message: error.message });
//   }
// };

// // Delete Role
// export const deleteRole = async (req, res) => {
//   try {
//     const { id } = req.params;

//     const deleted = await Role.findByIdAndDelete(id);

//     if (!deleted) {
//       return res
//         .status(404)
//         .json({ success: false, message: "Role not found" });
//     }

//     res.json({ success: true, message: "Role deleted successfully" });
//   } catch (error) {
//     res.status(500).json({ success: false, message: error.message });
//   }
// };

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
