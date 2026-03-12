import Staff from "../models/staff.model.js";
import Property from "../models/property.model.js";
import {getAccessibleKitchens, getRoleName} from "./internal.service.js";
import {
  deleteFromFirebase,
  uploadToFirebase,
} from "../../../../libs/common/imageOperation.js";
import {sendRPCRequest} from "../../../../libs/common/rabbitMq.js";
import {CLIENT_PATTERN} from "../../../../libs/patterns/client/client.pattern.js";
import {PROPERTY_PATTERN} from "../../../../libs/patterns/property/property.pattern.js";
import PropertyLog from "../models/propertyLog.model.js";
import mongoose from "mongoose";
import Attendance from "../models/attendance.model.js";

// 🛠️ Service logic
export const getAllStaff = async (data) => {
  try {
    const {kitchenId, propertyId, name, manager, joinDate, status} = data;

    const filter = {
      deleted: false, // ✅ Always exclude deleted staff
    };

    if (kitchenId) filter.kitchenId = kitchenId;
    if (propertyId) filter.propertyId = propertyId;

    if (joinDate) {
      const date = new Date(joinDate);

      const startDate = new Date(date.getTime() - 5.5 * 60 * 60 * 1000);
      startDate.setUTCHours(0, 0, 0, 0);

      const endDate = new Date(date.getTime() - 5.5 * 60 * 60 * 1000);
      endDate.setUTCHours(23, 59, 59, 999);

      filter.joinDate = {$gte: startDate, $lte: endDate};
    }

    if (status) filter.status = status;
    if (name) filter.name = {$regex: name, $options: "i"};

    // ✅ Main staff fetch
    const staffMembers = await Staff.find(filter);

    // --- If propertyId is present, also fetch staff linked via kitchenIds ---
    let kitchenStaff = [];

    if (propertyId) {
      try {
        const accessibleKitchens = await getAccessibleKitchens(propertyId);
        const accessibleKitchenIds = accessibleKitchens.map((k) =>
          k._id.toString(),
        );

        if (accessibleKitchenIds.length > 0) {
          kitchenStaff = await Staff.find({
            kitchenId: {$in: accessibleKitchenIds},
            deleted: false, // ✅ exclude deleted
            ...(status && {status}),
            ...(name && {name: {$regex: name, $options: "i"}}),
            ...(joinDate && {joinDate: filter.joinDate}),
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
      }),
    );

    // --- Include manager data if requested ---
    if (manager === "true") {
      try {
        const managerResponse = await sendRPCRequest(
          CLIENT_PATTERN.MANAGER.GET_ALL_MANAGERS,
          {propertyId, joinDate, status, name},
        );

        const managerData = managerResponse?.data || managerResponse;

        if (Array.isArray(managerData) && managerData.length > 0) {
          const enrichedManagers = await Promise.all(
            managerData
              .filter((m) => m && m.deleted !== true) // ✅ exclude deleted managers
              .map(async (m) => {
                const enrichedManager = {...m};

                if (m.role) {
                  const roleName = await getRoleName(m.role);
                  enrichedManager.role = {
                    _id: m.role,
                    name: roleName,
                  };
                }

                return enrichedManager;
              }),
          );

          enrichedStaff.push(...enrichedManagers);
        }
      } catch (error) {
        console.error(
          `Could not fetch or process manager for property ${propertyId}:`,
          error.message,
        );
      }
    }

    // ✅ Final Safety Filter (double protection)
    enrichedStaff = enrichedStaff.filter((item) => item.deleted !== true);

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
    const {id} = data;

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
          {id: propertyId},
        );

        if (propertyResponse?.data) {
          const propertyData = propertyResponse.data;
          staffObject.Property = {
            _id: propertyData._id,
            name: propertyData.propertyName,
          };
        } else {
          staffObject.Property = {name: "Property details not found"};
        }
      } catch (error) {
        console.error(
          `❌ Failed to fetch property details for ID ${propertyId}:`,
          error.message,
        );
        staffObject.Property = {name: "Could not fetch property"};
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
    const {id, adminName} = data;

    const staff = await Staff.findById(id);
    if (!staff) {
      return {status: 404, message: "Staff not found"};
    }

    if (staff.deleted) {
      return {status: 400, message: "Staff already deleted"};
    }

    // Soft delete
    staff.deleted = true;
    staff.status = "Inactive";

    await staff.save();

    // Get property name for message
    let propertyName = "Unknown Property";
    if (staff.propertyId) {
      const property = await Property.findById(staff.propertyId);
      if (property) propertyName = property.propertyName;
    }

    return {
      status: 200,
      message: `Employee "${staff.name}" was removed from property "${propertyName}" by ${adminName}`,
    };
  } catch (error) {
    console.error("Error in deleteStaff service:", error);
    return {
      status: 500,
      message: error.message || "Internal server error while deleting staff",
    };
  }
};

/**
 * Toggle staff status
 */
export const staffStatusChange = async (data) => {
  try {
    const {id, adminName} = data;

    const staff = await Staff.findById(id);
    if (!staff) return {status: 404, message: "Staff not found"};

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
    return {
      status: 500,
      message: error.message || "Internal server error while updating status",
    };
  }
};

/**
 * Get staff by propertyId
 */
export const getStaffByPropertyId = async (data) => {
  try {
    const {propertyId} = data;

    const staffMembers = await Staff.find({propertyId, deleted: false});

    const enrichedStaff = await Promise.all(
      staffMembers.map(async (staff) => {
        const staffObject = staff.toObject();
        if (staff.role) {
          const roleName = await getRoleName(staff.role);
          staffObject.role = {_id: staff.role, name: roleName};
        }
        return staffObject;
      }),
    );

    return {
      status: 200,
      // data: { count: enrichedStaff.length, staff: enrichedStaff },
      data: enrichedStaff,
    };
  } catch (error) {
    console.error("Error in getStaffByPropertyId service:", error);
    return {
      status: 500,
      message: error.message || "Internal server error while fetching staff",
    };
  }
};

export const addStaff = async (data) => {
  try {
    const {
      name,
      jobTitle,
      employeeType,
      gender,
      contactNumber,
      address,
      salary,
      joinDate,
      status,
      propertyId,
      createdBy,
      kitchenId,
      adminName,
      files,
      clientId,
    } = data;

    // ✅ Handle file uploads
    let photoUrl = null;
    let aadharFrontUrl = null;
    let aadharBackUrl = null;
    let panCardUrl = null;

    if (files) {
      if (files.photo) {
        photoUrl = await uploadToFirebase(files.photo, "staff-photos");
      }
      if (files.aadharFrontImage) {
        aadharFrontUrl = await uploadToFirebase(
          files.aadharFrontImage,
          "staff-documents",
        );
      }
      if (files.aadharBackImage) {
        aadharBackUrl = await uploadToFirebase(
          files.aadharBackImage,
          "staff-documents",
        );
      }
      if (files.panCardImage) {
        panCardUrl = await uploadToFirebase(
          files.panCardImage,
          "staff-documents",
        );
      }
    }

    // ✅ Save staff
    const newStaff = new Staff({
      name,
      jobTitle,
      employeeType,
      gender,
      contactNumber,
      address,
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
      panCardImage: panCardUrl,
      clientId,
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

    return {
      status: 201,
      message: "Staff added successfully",
      data: savedStaff,
    };
  } catch (error) {
    console.error("❌ Error in addStaff:", error);
    return {status: 500, message: error.message};
  }
};

export const updateStaff = async (data) => {
  try {
    const {staffId, updateData = {}, adminName, files} = data;
    console.log(data);
    // ============================================================
    // 1️⃣ Check if staff exists
    // ============================================================
    const existingStaff = await Staff.findById(staffId);
    if (!existingStaff) {
      return {status: 404, message: "Staff not found"};
    }

    // ============================================================
    // 2️⃣ Normalize propertyId & kitchenId (string → array)
    // ============================================================
    if (updateData.propertyId) {
      if (!Array.isArray(updateData.propertyId)) {
        updateData.propertyId = [updateData.propertyId];
      }
    }

    if (updateData.kitchenId) {
      if (!Array.isArray(updateData.kitchenId)) {
        updateData.kitchenId = [updateData.kitchenId];
      }
    }

    // ============================================================
    // 3️⃣ Handle employeeType switching
    // ============================================================
    if (updateData.employeeType) {
      switch (updateData.employeeType) {
        case "Property":
          updateData.kitchenId = [];
          break;

        case "Kitchen":
          updateData.propertyId = [];
          break;

        case "Property & Kitchen":
          // allow both
          break;

        default:
          return {status: 400, message: "Invalid employeeType"};
      }
    }

    // ============================================================
    // 4️⃣ Validate propertyIds (if provided)
    // ============================================================
    if (updateData.propertyId && updateData.propertyId.length > 0) {
      const validProperties = await Property.find({
        _id: {$in: updateData.propertyId},
      });

      if (validProperties.length !== updateData.propertyId.length) {
        return {status: 404, message: "One or more properties not found"};
      }
    }

    // ============================================================
    // 6️⃣ Handle File Replacements (only if file exists)
    // ============================================================
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
          "staff-documents",
        );
      }

      if (files.aadharBackImage) {
        if (existingStaff.aadharBackImage) {
          await deleteFromFirebase(existingStaff.aadharBackImage);
        }
        updateData.aadharBackImage = await uploadToFirebase(
          files.aadharBackImage,
          "staff-documents",
        );
      }

      if (files.panCardImage) {
        if (existingStaff.panCardImage) {
          await deleteFromFirebase(existingStaff.panCardImage);
        }
        updateData.panCardImage = await uploadToFirebase(
          files.panCardImage,
          "staff-documents",
        );
      }
    }

    // ============================================================
    // 7️⃣ Ensure numeric fields are proper numbers
    // ============================================================
    if (updateData.salary) {
      updateData.salary = Number(updateData.salary);
    }

    // ============================================================
    // 8️⃣ Set updatedBy
    // ============================================================
    updateData.updatedBy = adminName;

    // ============================================================
    // 9️⃣ Update Staff
    // ============================================================
    const updatedStaff = await Staff.findByIdAndUpdate(
      staffId,
      {$set: updateData},
      {
        new: true,
        runValidators: true,
      },
    );

    // ============================================================
    // 🔟 Logging
    // ============================================================
    try {
      let propertyName = "N/A";

      if (updatedStaff.propertyId?.length > 0) {
        const property = await Property.findById(updatedStaff.propertyId[0]);
        propertyName = property?.propertyName || "Unknown Property";
      }

      await PropertyLog.create({
        propertyId: updatedStaff.propertyId?.[0] || null,
        action: "update",
        category: "staff",
        changedByName: adminName,
        message: `Employee "${updatedStaff.name}" (Contact: ${updatedStaff.contactNumber}) updated in property "${propertyName}" by ${adminName}`,
      });
    } catch (logError) {
      console.error("Failed to save property log (updateStaff):", logError);
    }

    return {
      status: 200,
      message: "Staff updated successfully",
      data: updatedStaff,
    };
  } catch (error) {
    console.error("❌ Error in updateStaff:", error);
    return {status: 500, message: error.message};
  }
};

export const getEmployeeCount = async (data) => {
  try {
    const {propertyId, clientId} = data;
    console.log(data);
    const filter = {
      status: "Active",
      deleted: false,
    };

    if (propertyId) {
      filter.propertyId = {
        $in: [new mongoose.Types.ObjectId(propertyId)],
      };
    } else if (clientId) {
      filter.clientId = new mongoose.Types.ObjectId(clientId);
    }

    // Run in parallel (faster)
    const [staffCount, managerResponse] = await Promise.all([
      Staff.countDocuments(filter),
      sendRPCRequest(CLIENT_PATTERN.MANAGER.GET_MANAGER_COUNTS, {
        propertyId,
        clientId,
      }),
    ]);

    const managerCount = managerResponse?.data?.count || 0;

    const count = staffCount + managerCount;

    return count;
  } catch (error) {
    console.log("Error in getEmployeeCount:", error);
    return {
      status: 500,
      message: error.message || "Error counting employees",
    };
  }
};

export const getAllStaffsForAttendance = async (data) => {
  try {
    const {kitchenId, propertyId, name, manager, joinDate, status} = data;

    // ✅ Always exclude deleted staff
    const filter = {deleted: false};

    if (kitchenId) filter.kitchenId = kitchenId;
    if (propertyId) filter.propertyId = propertyId;

    if (joinDate) {
      const date = new Date(joinDate);
      const startDate = new Date(date.getTime() - 5.5 * 60 * 60 * 1000);
      startDate.setUTCHours(0, 0, 0, 0);

      const endDate = new Date(date.getTime() - 5.5 * 60 * 60 * 1000);
      endDate.setUTCHours(23, 59, 59, 999);

      filter.joinDate = {$gte: startDate, $lte: endDate};
    }

    if (status) filter.status = status;
    if (name) filter.name = {$regex: name, $options: "i"};

    // ✅ Main staff
    const staffMembers = await Staff.find(filter);

    // --- Kitchen staff ---
    let kitchenStaff = [];

    if (propertyId) {
      try {
        const accessibleKitchens = await getAccessibleKitchens(propertyId);
        const accessibleKitchenIds = accessibleKitchens.map((k) =>
          k._id.toString(),
        );

        if (accessibleKitchenIds.length > 0) {
          kitchenStaff = await Staff.find({
            kitchenId: {$in: accessibleKitchenIds},
            deleted: false, // ✅ exclude deleted
            ...(status && {status}),
            ...(name && {name: {$regex: name, $options: "i"}}),
            ...(joinDate && {joinDate: filter.joinDate}),
          });
        }
      } catch (err) {
        console.error("Error fetching kitchen staff:", err.message);
      }
    }

    // Merge & deduplicate
    const allStaff = [...staffMembers, ...kitchenStaff];
    const uniqueStaffMap = new Map(allStaff.map((s) => [s._id.toString(), s]));
    const uniqueStaff = Array.from(uniqueStaffMap.values());

    // --- Current month range ---
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59,
      999,
    );

    // ✅ Enrich staff
    let enrichedStaff = await Promise.all(
      uniqueStaff.map(async (staff) => {
        const staffObject = staff.toObject();

        if (staff.role) {
          const roleName = await getRoleName(staff.role);
          staffObject.role = {_id: staff.role, name: roleName};
        }

        const todayAttendance = await Attendance.findOne({
          employeeId: staff._id,
        })
          .sort({date: -1})
          .lean();

        staffObject.todayAttendanceDate = todayAttendance?.date || null;
        staffObject.todayStatus = todayAttendance?.status || "Not Marked";

        const previousAttendance = await Attendance.findOne({
          employeeId: staff._id,
        })
          .sort({date: -1})
          .skip(1)
          .lean();

        staffObject.lastAttendanceDate = previousAttendance?.date || null;
        staffObject.lastDayStatus = previousAttendance?.status || "Not Marked";

        const monthlyPresentCount = await Attendance.countDocuments({
          employeeId: staff._id,
          status: "Present",
          date: {$gte: startOfMonth, $lte: endOfMonth},
        });

        staffObject.monthlyPresentDays = monthlyPresentCount;

        return staffObject;
      }),
    );

    // --- Include managers ---
    if (manager === "true") {
      try {
        const managerResponse = await sendRPCRequest(
          CLIENT_PATTERN.MANAGER.GET_ALL_MANAGERS,
          {propertyId, joinDate, status, name},
        );

        const managerData = managerResponse?.data || managerResponse;

        if (Array.isArray(managerData) && managerData.length > 0) {
          const enrichedManagers = await Promise.all(
            managerData
              .filter((m) => m && m.deleted !== true) // ✅ exclude deleted managers
              .map(async (m) => {
                const enrichedManager = {...m};

                if (m.role) {
                  const roleName = await getRoleName(m.role);
                  enrichedManager.role = {
                    _id: m.role,
                    name: roleName,
                  };
                }

                const todayAttendance = await Attendance.findOne({
                  employeeId: m._id,
                })
                  .sort({date: -1})
                  .lean();

                enrichedManager.todayAttendanceDate =
                  todayAttendance?.date || null;
                enrichedManager.todayStatus =
                  todayAttendance?.status || "Not Marked";

                const previousAttendance = await Attendance.findOne({
                  employeeId: m._id,
                })
                  .sort({date: -1})
                  .skip(1)
                  .lean();

                enrichedManager.lastAttendanceDate =
                  previousAttendance?.date || null;
                enrichedManager.lastDayStatus =
                  previousAttendance?.status || "Not Marked";

                const monthlyPresentCount = await Attendance.countDocuments({
                  employeeId: m._id,
                  status: "Present",
                  date: {
                    $gte: startOfMonth,
                    $lte: endOfMonth,
                  },
                });

                enrichedManager.monthlyPresentDays = monthlyPresentCount;

                return enrichedManager;
              }),
          );

          enrichedStaff.push(...enrichedManagers);
        }
      } catch (error) {
        console.error(
          `Could not fetch or process manager for property ${propertyId}:`,
          error.message,
        );
      }
    }

    // ✅ Final safety filter
    enrichedStaff = enrichedStaff.filter((emp) => emp.deleted !== true);

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
