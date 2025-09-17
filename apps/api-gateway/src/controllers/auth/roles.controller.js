// import Role from "../models/role.model.js";

import { sendRPCRequest } from "../../../../../libs/common/rabbitMq.js";
import { AUTH_PATTERN } from "../../../../../libs/patterns/auth/auth.pattern.js";

export const createRole = async (req, res) => {
  try {
    const { roleName, permissions, reportTo } = req.body;

    const newRole = await sendRPCRequest(AUTH_PATTERN.ROLE.CREATE_ROLE, {
      roleName,
      permissions,
      reportTo,
    });

    if (newRole.status === 200) {
      res.status(201).json(newRole);
    } else {
      res.status(newRole.status).json(newRole);
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateRole = async (req, res) => {
  const { id } = req.params;
  const { roleName, permissions, reportTo } = req.body;

  const response = await sendRPCRequest(AUTH_PATTERN.ROLE.UPDATE_ROLE, {
    id,
    roleName,
    permissions,
    reportTo,
  });

  return res.status(response.status).json(response);
};

export const deleteRole = async (req, res) => {
  const { id } = req.params;

  const response = await sendRPCRequest(AUTH_PATTERN.ROLE.DELETE_ROLE, { id });

  return res.status(response.status).json(response);
};

export const getRoleById = async (req, res) => {
  const response = await sendRPCRequest(AUTH_PATTERN.ROLE.GET_ALL_ROLES, {});

  return res.status(response.status).json(response);
};

export const getAllRoles = async (req, res) => {
  const { id } = req.params;

  const response = await sendRPCRequest(AUTH_PATTERN.ROLE.GET_ROLE_BY_ID, {
    id,
  });

  return res.status(response.status).json(response);
};

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
