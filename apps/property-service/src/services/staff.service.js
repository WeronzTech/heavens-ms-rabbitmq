import Staff from "../models/staff.model.js";
import axios from "axios";
import Property from "../models/property.model.js";
import { getAccessibleKitchens, getRoleName } from "./internal.service.js";
import { deleteFromFirebase, uploadToFirebase } from "../../../../libs/common/imageOperation.js";
import { sendRPCRequest } from "../../../../libs/common/rabbitMq.js";
import { CLIENT_PATTERN } from "../../../../libs/patterns/client/client.pattern.js";
import { PROPERTY_PATTERN } from "../../../../libs/patterns/property/property.pattern.js";
import PropertyLog from "../models/propertyLog.model.js";

// 🛠️ Service logic
export const getAllStaff = async (data) => {
  try {
    const { kitchenId, propertyId, name, manager, joinDate, status } = data;
    const filter = {};

    if (kitchenId) filter.kitchenId = kitchenId;
    if (propertyId) filter.propertyId = propertyId;

    if (joinDate) {
      const date = new Date(joinDate);

      const startDate = new Date(date.getTime() - 5.5 * 60 * 60 * 1000);
      startDate.setUTCHours(0, 0, 0, 0);

      const endDate = new Date(date.getTime() - 5.5 * 60 * 60 * 1000);
      endDate.setUTCHours(23, 59, 59, 999);

      filter.joinDate = { $gte: startDate, $lte: endDate };
    }

    if (status) filter.status = status;
    if (name) filter.name = { $regex: name, $options: "i" };

    const staffMembers = await Staff.find(filter);

    // --- If propertyId is present, also fetch staff linked via kitchenIds ---
    let kitchenStaff = [];
    if (propertyId) {
      try {
        const accessibleKitchens = await getAccessibleKitchens(propertyId); 
        const accessibleKitchenIds = accessibleKitchens.map((k) => k._id.toString());

        if (accessibleKitchenIds.length > 0) {
          kitchenStaff = await Staff.find({
            kitchenId: { $in: accessibleKitchenIds },
            ...(status && { status }),
            ...(name && { name: { $regex: name, $options: "i" } }),
            ...(joinDate && { joinDate: filter.joinDate }),
          });
        }
      } catch (err) {
        console.error("Error fetching kitchen staff:", err.message);
      }
    }

    // Merge & deduplicate staff
    const allStaff = [...staffMembers, ...kitchenStaff];
    const uniqueStaffMap = new Map(allStaff.map((s) => [s._id.toString(), s]));
    const uniqueStaff = Array.from(uniqueStaffMap.values());

    // Enrich staff with role names
    let enrichedStaff = await Promise.all(
      uniqueStaff.map(async (staff) => {
        const staffObject = staff.toObject();
        if (staff.role) {
          const roleName = await getRoleName(staff.role);
          staffObject.role = {
            _id: staff.role,
            name: roleName,
          };
        }
        return staffObject;
      })
    );

    // --- Include manager data if requested ---
    if (manager === "true") {
      try {
        const managerResponse = async (propertyId, joinDate, status, name) => {
          return sendRPCRequest(CLIENT_PATTERN.MANAGER.GET_ALL_MANAGERS, {
            propertyId, joinDate, status, name,
          });
        };

        const managerData = managerResponse.data?.data;

        if (Array.isArray(managerData) && managerData.length > 0) {
          const enrichedManagers = await Promise.all(
            managerData.map(async (m) => {
              if (m && m._id) {
                const enrichedManager = { ...m };
                if (m.role) {
                  const roleName = await getRoleName(m.role);
                  enrichedManager.role = { _id: m.role, name: roleName };
                }
                return enrichedManager;
              }
              return null;
            })
          );

          enrichedStaff.push(...enrichedManagers.filter(Boolean));
        }
      } catch (error) {
        console.error(`Could not fetch or process manager for property ${propertyId}:`, error.message);
      }
    }

    return {
      status: 200,
      data: {
        count: enrichedStaff.length,
        staff: enrichedStaff,
      },
    };
  } catch (error) {
    console.error("Error in getAllStaff service:", error);
    return {
      status: 500,
      message: error.message || "Internal server error while fetching staff",
    };
  }
};

export const getStaffById = async (data) => {
  try {
    const { id } = data;

    if (!id) {
      return {
        status: 400,
        message: "Staff ID is required",
      };
    }

    const staff = await Staff.findById(id);
    if (!staff) {
      return {
        status: 404,
        message: "Staff not found",
      };
    }

    const staffObject = staff.toObject();

    // --- Fetch property details if staff has propertyId ---
    if (staff.propertyId && staff.propertyId.length > 0) {
      const propertyId = staff.propertyId[0];

      try {
        const propertyResponse = await sendRPCRequest(
          PROPERTY_PATTERN.PROPERTY.GET_PROPERTY_BY_ID,
          { id: propertyId }
        );

        if (propertyResponse?.data) {
          const propertyData = propertyResponse.data;
          staffObject.Property = {
            _id: propertyData._id,
            name: propertyData.propertyName,
          };
        } else {
          staffObject.Property = { name: "Property details not found" };
        }
      } catch (error) {
        console.error(
          `❌ Failed to fetch property details for ID ${propertyId}:`,
          error.message
        );
        staffObject.Property = { name: "Could not fetch property" };
      }
    }

    return {
      status: 200,
      data: staffObject,
    };
  } catch (error) {
    console.error("❌ Error in getStaffById service:", error);
    return {
      status: 500,
      message: error.message || "Internal server error while fetching staff",
    };
  }
};


export const deleteStaff = async (data) => {
  try {
    const { id, adminName } = data;

    const staff = await Staff.findById(id);
    if (!staff) return { status: 404, message: "Staff not found" };

    await Staff.findByIdAndDelete(id);

    let propertyName = "Unknown Property";
    if (staff.propertyId) {
      const property = await Property.findById(staff.propertyId);
      if (property) propertyName = property.propertyName;
    }

    return {
      status: 200,
      message: `Employee "${staff.name}" was deleted from property "${propertyName}" by ${adminName}`,
    };
  } catch (error) {
    console.error("Error in deleteStaff service:", error);
    return { status: 500, message: error.message || "Internal server error while deleting staff" };
  }
};

/**
 * Toggle staff status
 */
export const staffStatusChange = async (data) => {
  try {
    const { id, adminName } = data;

    const staff = await Staff.findById(id);
    if (!staff) return { status: 404, message: "Staff not found" };

    const oldStatus = staff.status;
    staff.status = oldStatus === "Active" ? "Inactive" : "Active";
    await staff.save();

    let propertyName = "Unknown Property";
    if (staff.propertyId) {
      const property = await Property.findById(staff.propertyId);
      if (property) propertyName = property.propertyName;
    }

    return {
      status: 200,
      message: `Status of "${staff.name}" changed from "${oldStatus}" to "${staff.status}" for property "${propertyName}" by ${adminName}`,
    };
  } catch (error) {
    console.error("Error in staffStatusChange service:", error);
    return { status: 500, message: error.message || "Internal server error while updating status" };
  }
};

/**
 * Get staff by propertyId
 */
export const getStaffByPropertyId = async (data) => {
  try {
    const { propertyId } = data;

    const staffMembers = await Staff.find({ propertyId, deleted: false });

    const enrichedStaff = await Promise.all(
      staffMembers.map(async (staff) => {
        const staffObject = staff.toObject();
        if (staff.role) {
          const roleName = await getRoleName(staff.role);
          staffObject.role = { _id: staff.role, name: roleName };
        }
        return staffObject;
      })
    );

    return { status: 200, data: { count: enrichedStaff.length, staff: enrichedStaff } };
  } catch (error) {
    console.error("Error in getStaffByPropertyId service:", error);
    return { status: 500, message: error.message || "Internal server error while fetching staff" };
  }
};

export const addStaff = async (data) => {
  try {
    const {
      name,
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
      adminName, // pass from controller
      files, // files passed via RPC
    } = data;

    // ✅ Validate property
    const existingProperty = await Property.findById(propertyId);
    if (!existingProperty) {
      return { status: 404, message: "Property not found" };
    }

    // ✅ Handle file uploads
    let photoUrl = null;
    let aadharFrontUrl = null;
    let aadharBackUrl = null;

    if (files) {
      if (files.photo) {
        photoUrl = await uploadToFirebase(files.photo, "staff-photos");
      }
      if (files.aadharFrontImage) {
        aadharFrontUrl = await uploadToFirebase(
          files.aadharFrontImage,
          "staff-documents"
        );
      }
      if (files.aadharBackImage) {
        aadharBackUrl = await uploadToFirebase(
          files.aadharBackImage,
          "staff-documents"
        );
      }
    }

    // ✅ Save staff
    const newStaff = new Staff({
      name,
      gender,
      dob,
      contactNumber,
      address,
      email,
      role,
      salary,
      pendingSalary: salary,
      joinDate,
      status,
      propertyId,
      createdBy,
      kitchenId,
      photo: photoUrl,
      aadharFrontImage: aadharFrontUrl,
      aadharBackImage: aadharBackUrl,
    });

    const savedStaff = await newStaff.save();

    // ✅ Log action
    try {
      await PropertyLog.create({
        propertyId,
        action: "create",
        category: "staff",
        changedByName: adminName,
        message: `Employee "${name}" (Contact: ${contactNumber}) added to property "${existingProperty.propertyName}" by ${adminName}`,
      });
    } catch (logError) {
      console.error("Failed to save property log (addStaff):", logError);
    }

    return { status: 201, message: "Staff added successfully", data: savedStaff };
  } catch (error) {
    console.error("❌ Error in addStaff:", error);
    return { status: 500, message: error.message };
  }
};


export const updateStaff = async (data) => {
  try {
    const {
      staffId,
      updateData,
      adminName,
      files, // files from RPC
    } = data;

    // ✅ Check if staff exists
    const existingStaff = await Staff.findById(staffId);
    if (!existingStaff) {
      return { status: 404, message: "Staff not found" };
    }

    // ✅ Handle file replacements
    if (files) {
      if (files.photo) {
        if (existingStaff.photo) {
          await deleteFromFirebase(existingStaff.photo);
        }
        updateData.photo = await uploadToFirebase(files.photo, "staff-photos");
      }

      if (files.aadharFrontImage) {
        if (existingStaff.aadharFrontImage) {
          await deleteFromFirebase(existingStaff.aadharFrontImage);
        }
        updateData.aadharFrontImage = await uploadToFirebase(
          files.aadharFrontImage,
          "staff-documents"
        );
      }

      if (files.aadharBackImage) {
        if (existingStaff.aadharBackImage) {
          await deleteFromFirebase(existingStaff.aadharBackImage);
        }
        updateData.aadharBackImage = await uploadToFirebase(
          files.aadharBackImage,
          "staff-documents"
        );
      }
    }

    // ✅ Validate property if changed
    if (updateData.propertyId) {
      const propertyExists = await Property.findById(updateData.propertyId);
      if (!propertyExists) {
        return { status: 404, message: "Property not found" };
      }
    }

    // ✅ Update staff
    const updatedStaff = await Staff.findByIdAndUpdate(staffId, updateData, {
      new: true,
      runValidators: true,
    });

    // ✅ Log update
    try {
      const propertyName =
        (await Property.findById(updatedStaff.propertyId))?.propertyName ||
        "Unknown Property";

      await PropertyLog.create({
        propertyId: updatedStaff.propertyId,
        action: "update",
        category: "staff",
        changedByName: adminName,
        message: `Employee "${updatedStaff.name}" (Contact: ${updatedStaff.contactNumber}) updated in property "${propertyName}" by ${adminName}`,
      });
    } catch (logError) {
      console.error("Failed to save property log (updateStaff):", logError);
    }

    return { status: 200, message: "Staff updated successfully", data: updatedStaff };
  } catch (error) {
    console.error("❌ Error in updateStaff:", error);
    return { status: 500, message: error.message };
  }
};