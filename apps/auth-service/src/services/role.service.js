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

export const getRoleName = async (data) => {
  try {
    // console.log(data)

    const { roleId } = data;
    // console.log(roleId)

    if (!roleId) {
      return {
        status: 400,
        body: { error: "id is required" },
      };
    }

    const role = await Role.findById(roleId).populate("reportTo", "roleName");

    if (!role) {
      return {
        status: 404,
        body: { error: "Role not found" },
      };
    }

    return {
      status: 200,
      body: role,
    };
  } catch (error) {
    console.error("Error fetching role:", error);
    return {
      status: 500,
      body: { error: "Internal server error" },
    };
  }
};

export const updateRole = async (data) => {
  try {
    const { id, roleName, permissions, reportTo } = data;
    console.log(data);
    const updatedRole = await Role.findByIdAndUpdate(
      id,
      { roleName, permissions, reportTo },
      { new: true },
    );

    if (!updatedRole) {
      return {
        status: 404,
        success: false,
        message: "Role not found",
      };
    }

    return {
      status: 200,
      success: true,
      data: updatedRole,
    };
  } catch (error) {
    return {
      status: 500,
      success: false,
      message: error.message,
    };
  }
};

export const deleteRole = async (data) => {
  try {
    const { id } = data;

    const deleted = await Role.findByIdAndDelete(id);

    if (!deleted) {
      return {
        status: 404,
        success: false,
        message: "Role not found",
      };
    }

    return {
      status: 200,
      success: true,
      message: "Role deleted successfully",
    };
  } catch (error) {
    return {
      status: 500,
      success: false,
      message: error.message,
    };
  }
};

export const getAllRoles = async () => {
  try {
    const roles = await Role.find().populate("reportTo", "roleName");

    return {
      status: 200,
      success: true,
      data: roles,
    };
  } catch (error) {
    return {
      status: 500,
      success: false,
      message: error.message,
    };
  }
};

export const getRoleById = async (data) => {
  try {
    const { id } = data;
    const role = await Role.findById(id).populate("reportTo", "roleName");

    if (!role) {
      return {
        status: 404,
        success: false,
        message: "Role not found",
      };
    }

    return {
      status: 200,
      success: true,
      data: role,
    };
  } catch (error) {
    return {
      status: 500,
      success: false,
      message: error.message,
    };
  }
};
