import { sendRPCRequest } from "../../../../../libs/common/rabbitMq.js";
import { PROPERTY_PATTERN } from "../../../../../libs/patterns/property/property.pattern.js";

// 🎯 Controller for fetching all staff via RPC
export const getAllStaff = async (req, res) => {
  try {
    const { kitchenId, propertyId, name, manager, joinDate, status } =
      req.query;

    // Send request to staff service using RPC
    const response = await sendRPCRequest(
      PROPERTY_PATTERN.STAFF.GET_ALL_STAFF,
      { kitchenId, propertyId, name, manager, joinDate, status }
    );

    console.log("👥 Staff RPC Response:", response);

    if (response.status === 200) {
      return res.status(200).json({
        success: true,
        count: response.data.count,
        staff: response.data.staff,
      });
    } else {
      return res.status(response.status).json({
        success: false,
        message: response.message || "Failed to fetch staff",
      });
    }
  } catch (error) {
    console.error("❌ Error in getAllStaff controller:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Server error while fetching staff",
    });
  }
};

export const getStaffById = async (req, res) => {
  try {
    const { id } = req.params;

    // Send request to staff service using RPC
    const response = await sendRPCRequest(
      PROPERTY_PATTERN.STAFF.GET_STAFF_BY_ID,
      { id }
    );

    console.log("👤 Staff By ID RPC Response:", response);

    if (response.status === 200) {
      return res.status(200).json({
        success: true,
        data: response.data,
      });
    } else {
      return res.status(response.status).json({
        success: false,
        message: response.message || "Staff not found",
      });
    }
  } catch (error) {
    console.error("❌ Error in getStaffById controller:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Server error while fetching staff by ID",
    });
  }
};

export const deleteStaff = async (req, res) => {
  try {
    const { id } = req.params;
    const adminName = req.headers["x-user-username"];

    const response = await sendRPCRequest(PROPERTY_PATTERN.STAFF.DELETE_STAFF, {
      id,
      adminName,
    });

    console.log("🗑️ Delete Staff RPC Response:", response);

    return res.status(response.status).json(response);
  } catch (error) {
    console.error("❌ Error in deleteStaff controller:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Server error while deleting staff",
    });
  }
};

// 🎯 Controller for changing staff status via RPC
export const staffStatusChange = async (req, res) => {
  try {
    const { id } = req.params;
    const adminName = req.headers["x-user-username"];

    const response = await sendRPCRequest(
      PROPERTY_PATTERN.STAFF.STAFF_STATUS_CHANGE,
      { id, adminName }
    );

    console.log(" Staff Status Change RPC Response:", response);

    return res.status(response.status).json(response);
  } catch (error) {
    console.error(" Error in staffStatusChange controller:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Server error while updating staff status",
    });
  }
};

// 🎯 Controller for fetching staff by Property ID via RPC
export const getStaffByPropertyId = async (req, res) => {
  try {
    const { propertyId } = req.params;

    const response = await sendRPCRequest(
      PROPERTY_PATTERN.STAFF.GET_STAFF_BY_PROPERTYID,
      { propertyId }
    );

    console.log("🏠 Staff By Property RPC Response:", response);

    if (response.status === 200) {
      return res.status(200).json(response.data);
    } else {
      return res.status(response.status).json({
        success: false,
        message: response.message || "Failed to fetch staff by property",
      });
    }
  } catch (error) {
    console.error("❌ Error in getStaffByPropertyId controller:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Server error while fetching staff by property",
    });
  }
};

export const addStaff = async (req, res) => {
  try {
    const {
      name,
      jobTitle,
      gender,
      dob,
      contactNumber,
      address,
      email,
      role,
      salary,
      joinDate,
      status,
      propertyId,
      createdBy,
      kitchenId,
    } = req.body;

    // ✅ Pass file buffers directly to RPC
    const files = {
      photo: req.files?.photo?.[0] || null,
      aadharFrontImage: req.files?.aadharFrontImage?.[0] || null,
      aadharBackImage: req.files?.aadharBackImage?.[0] || null,
    };

    const adminName = req.headers["x-user-username"];

    const response = await sendRPCRequest(PROPERTY_PATTERN.STAFF.ADD_STAFF, {
      name,
      jobTitle,
      gender,
      dob,
      contactNumber,
      address,
      email,
      role,
      salary,
      joinDate,
      status,
      propertyId,
      createdBy,
      kitchenId,
      adminName,
      files, // send files as-is
    });

    console.log("📨 Staff Add RPC Response:", response);
    return res.status(response.status).json(response);
  } catch (error) {
    console.error("❌ Error in addStaff controller:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Server error while adding staff",
    });
  }
};

// 🎯 Update staff via RPC
export const updateStaff = async (req, res) => {
  try {
    const { id } = req.params;

    // ✅ Attach update body
    const updateData = { ...req.body };

    // ✅ Pass file buffers directly to RPC
    const files = {
      photo: req.files?.photo?.[0] || null,
      aadharFrontImage: req.files?.aadharFrontImage?.[0] || null,
      aadharBackImage: req.files?.aadharBackImage?.[0] || null,
    };

    const adminName = req.headers["x-user-username"];

    const response = await sendRPCRequest(PROPERTY_PATTERN.STAFF.UPDATE_STAFF, {
      staffId: id,
      updateData,
      adminName,
      files, // send files as-is
    });

    console.log("✏️ Staff Update RPC Response:", response);
    return res.status(response.status).json(response);
  } catch (error) {
    console.error("❌ Error in updateStaff controller:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Server error while updating staff",
    });
  }
};

export const getAllStaffForAttendance = async (req, res) => {
  try {
    const { kitchenId, propertyId, name, manager, joinDate, status } =
      req.query;

    // Send request to staff service using RPC
    const response = await sendRPCRequest(
      PROPERTY_PATTERN.STAFF.GET_ALL_STAFF_FOR_ATTENDANCE,
      { kitchenId, propertyId, name, manager, joinDate, status }
    );

    console.log("👥 Staff RPC Response:", response);

    if (response.status === 200) {
      return res.status(200).json({
        success: true,
        count: response.data.count,
        staff: response.data.staff,
      });
    } else {
      return res.status(response.status).json({
        success: false,
        message: response.message || "Failed to fetch staff",
      });
    }
  } catch (error) {
    console.error("❌ Error in getAllStaff controller:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Server error while fetching staff",
    });
  }
};
