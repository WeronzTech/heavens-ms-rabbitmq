import { Role } from "../models/role.model.js";

export const createRole = async (data) => {
  try {
    const { roleName, permissions, reportTo } = data;

    const newRole = await Role.create({
      roleName,
      permissions,
      reportTo: reportTo || null,
    });

    return { success: true, status: 200, data: newRole };
  } catch (error) {
    return { success: false, status: 500, message: "Internal server error" };
  }
};
