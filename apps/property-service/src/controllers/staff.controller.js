import Property from "../models/property.model.js";
import PropertyLog from "../models/propertyLog.model.js";
import Staff from "../models/staff.model.js";
import {uploadToFirebase} from "../utils/imageOperation.js";
import axios from "axios";
import mongoose from "mongoose";
import {getAccessibleKitchens} from "../services/inventory.service.js";

export const addStaff = async (req, res) => {
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
    } = req.body;
    console.log(req.body);
    const files = req.files;

    const existingProperty = await Property.findById(propertyId);

    let photoUrl = null;
    let aadharFrontUrl = null;
    let aadharBackUrl = null;

    if (files) {
      if (files.photo && files.photo[0]) {
        console.log("Uploading photo...");
        photoUrl = await uploadToFirebase(files.photo[0], "staff-photos");
        console.log("Photo uploaded to:", photoUrl);
      }
      if (files.aadharFrontImage && files.aadharFrontImage[0]) {
        console.log("Uploading Aadhar front image...");
        aadharFrontUrl = await uploadToFirebase(
          files.aadharFrontImage[0],
          "staff-documents"
        );
        console.log("Aadhar front image uploaded to:", aadharFrontUrl);
      }
      if (files.aadharBackImage && files.aadharBackImage[0]) {
        console.log("Uploading Aadhar back image...");
        aadharBackUrl = await uploadToFirebase(
          files.aadharBackImage[0],
          "staff-documents"
        );
        console.log("Aadhar back image uploaded to:", aadharBackUrl);
      }
    }

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
    console.log("Saved staff document:", savedStaff);

    try {
      const adminName = req.headers["x-user-username"];
      const propertyName = existingProperty?.propertyName || "Unknown Property";

      await PropertyLog.create({
        propertyId,
        action: "update",
        category: "staff",
        changedByName: adminName,
        message: `Employee "${name}" (Contact: ${contactNumber}) added to property "${propertyName}" by ${adminName}`,
      });
    } catch (logError) {
      console.error("Failed to save property log (addStaff):", logError);
    }

    res.status(201).json({
      success: true,
      message: "Staff added successfully",
      staff: savedStaff,
    });
  } catch (error) {
    console.error("Error adding staff:", error);
    res.status(500).json({
      success: false,
      message: "Error adding staff",
      error: error.message,
    });
  }
};

// Get all staff members
// export const getAllStaff = async (req, res) => {
//   try {
//     const { kitchenId, propertyId, name, manager = false } = req.query;
//     const filter = {};
//     if (kitchenId) {
//       filter.kitchenId = kitchenId;
//     }
//     if (name) {
//       filter.name = { $regex: name, $options: "i" };
//     }
//     if (propertyId) {
//       filter.propertyId = propertyId;
//     }

//     const staffMembers = await Staff.find(filter);

//     const enrichedStaff = await Promise.all(
//       staffMembers.map(async (staff) => {
//         let roleName = "N/A";
//         try {
//           const roleResponse = await axios.get(
//             `${process.env.AUTH_SERVICE_URL}/auth/role/${staff.role}`
//           );

//           if (roleResponse.data) {
//             roleName = roleResponse.data.data.roleName;
//           }
//         } catch (error) {
//           console.error(
//             `Failed to fetch role for staff ${staff._id}:`,
//             error.message
//           );
//         }

//         return {
//           ...staff.toObject(),
//           role: {
//             _id: staff.role,
//             name: roleName,
//           },
//         };
//       })
//     );

//     res.status(200).json({
//       success: true,
//       count: enrichedStaff.length,
//       staff: enrichedStaff,
//     });
//   } catch (error) {
//     console.error("Error fetching staff:", error);
//     res.status(500).json({ success: false, message: "Error fetching staff" });
//   }
// };
const getRoleName = async (roleId) => {
  if (!roleId) return "N/A";
  try {
    const roleResponse = await axios.get(
      `${process.env.AUTH_SERVICE_URL}/auth/role/${roleId}`
    );
    return roleResponse.data?.data?.roleName || "N/A";
  } catch (error) {
    console.error(`Failed to fetch role for roleId ${roleId}:`, error.message);
    return "N/A";
  }
};

export const getAllStaff = async (req, res) => {
  try {
    const {kitchenId, propertyId, name, manager, joinDate, status} = req.query;
    const filter = {};
    console.log(req.query);

    if (kitchenId) filter.kitchenId = kitchenId;
    if (propertyId) filter.propertyId = propertyId;
    if (joinDate) {
      const date = new Date(joinDate);

      const startDate = new Date(date.getTime() - 5.5 * 60 * 60 * 1000);
      startDate.setUTCHours(0, 0, 0, 0);

      const endDate = new Date(date.getTime() - 5.5 * 60 * 60 * 1000);
      endDate.setUTCHours(23, 59, 59, 999);

      // Add the date range to the filter
      filter.joinDate = {$gte: startDate, $lte: endDate};
    }
    if (status) filter.status = status;
    if (name) filter.name = {$regex: name, $options: "i"};
    //  { $gte: startDate, $lte: endDate }
    // console.log("filter", filter);
    const staffMembers = await Staff.find(filter);

    // --- If propertyId is present, also fetch staff linked via kitchenIds ---
    let kitchenStaff = [];
    if (propertyId) {
      try {
        const accessibleKitchens = await getAccessibleKitchens(propertyId); // API call to inventory-service
        const accessibleKitchenIds = accessibleKitchens.map((k) =>
          k._id.toString()
        );
        console.log(accessibleKitchenIds);
        if (accessibleKitchenIds.length > 0) {
          // Find staff whose kitchenId array contains any of those IDs
          kitchenStaff = await Staff.find({
            kitchenId: {$in: accessibleKitchenIds},
            ...(status && {status}),
            ...(name && {name: {$regex: name, $options: "i"}}),
            ...(joinDate && {joinDate: filter.joinDate}),
          });
        }
      } catch (err) {
        console.error("Error fetching kitchen staff:", err.message);
      }
    }

    // Merge normal staff and kitchen staff, remove duplicates by _id
    const allStaff = [...staffMembers, ...kitchenStaff];
    const uniqueStaffMap = new Map(allStaff.map((s) => [s._id.toString(), s]));
    const uniqueStaff = Array.from(uniqueStaffMap.values());

    // --- Enrich staff with role names ---
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

    if (manager === "true") {
      try {
        const managerResponse = await axios.get(
          `${process.env.CLIENT_SERVICE_URL}/client/manager`,
          {params: {propertyId, joinDate: filter.joinDate, status, name}}
        );

        const managerData = managerResponse.data?.data;

        if (Array.isArray(managerData) && managerData.length > 0) {
          const enrichedManagers = await Promise.all(
            managerData.map(async (manager) => {
              if (manager && manager._id) {
                const enrichedManager = {...manager};
                if (manager.role) {
                  const roleName = await getRoleName(manager.role);
                  enrichedManager.role = {
                    _id: manager.role,
                    name: roleName,
                  };
                }
                return enrichedManager;
              }
              return null;
            })
          );

          enrichedStaff.push(...enrichedManagers.filter(Boolean));
        }
      } catch (error) {
        console.error(
          `Could not fetch or process manager for property ${propertyId}:`,
          error.message
        );
      }
    }

    res.status(200).json({
      success: true,
      count: enrichedStaff.length,
      staff: enrichedStaff,
    });
  } catch (error) {
    console.error("Error fetching staff:", error);
    res.status(500).json({success: false, message: "Error fetching staff"});
  }
};

// export const getAllStaff = async (req, res) => {
//   try {
//     const {kitchenId, propertyId, name, manager, joinDate, status} = req.query;
//     const filter = {};
//     console.log(req.query);
//     if (kitchenId) filter.kitchenId = kitchenId;
//     if (propertyId) filter.propertyId = propertyId;
//     if (joinDate) {
//       // Create a date object from the joinDate string (e.g., "2025-08-13")
//       const date = new Date(joinDate);

//       // Manually set the start of the day in IST (UTC+5:30)
//       const startDate = new Date(date.getTime() - 5.5 * 60 * 60 * 1000);
//       startDate.setUTCHours(0, 0, 0, 0);

//       // Manually set the end of the day in IST
//       const endDate = new Date(date.getTime() - 5.5 * 60 * 60 * 1000);
//       endDate.setUTCHours(23, 59, 59, 999);

//       // Add the date range to the filter
//       filter.joinDate = {$gte: startDate, $lte: endDate};
//     }
//     if (status) filter.status = status;
//     if (name) filter.name = {$regex: name, $options: "i"};
//     //  { $gte: startDate, $lte: endDate }
//     // console.log("filter", filter);
//     const staffMembers = await Staff.find(filter);
//     // console.log("Staff", staffMembers);

//     let enrichedStaff = await Promise.all(
//       staffMembers.map(async (staff) => {
//         const staffObject = staff.toObject();
//         if (staff.role) {
//           const roleName = await getRoleName(staff.role);
//           staffObject.role = {
//             _id: staff.role,
//             name: roleName,
//           };
//         }
//         return staffObject;
//       })
//     );

//     if (manager === "true") {
//       try {
//         const managerResponse = await axios.get(
//           `http://client-service:5001/api/v2/client/manager`,
//           {params: {propertyId, joinDate: filter.joinDate, status, name}}
//         );

//         const managerData = managerResponse.data?.data;
//         // console.log("managerData", managerData);

//         if (Array.isArray(managerData) && managerData.length > 0) {
//           const enrichedManagers = await Promise.all(
//             managerData.map(async (manager) => {
//               if (manager && manager._id) {
//                 const enrichedManager = {...manager};
//                 if (manager.role) {
//                   const roleName = await getRoleName(manager.role);
//                   enrichedManager.role = {
//                     _id: manager.role,
//                     name: roleName,
//                   };
//                 }
//                 return enrichedManager;
//               }
//               return null; // Return null for any invalid entries in the array
//             })
//           );

//           // Filter out any null values and add the valid managers to the staff list
//           enrichedStaff.push(...enrichedManagers.filter(Boolean));
//         }
//       } catch (error) {
//         console.error(
//           `Could not fetch or process manager for property ${propertyId}:`,
//           error.message
//         );
//       }
//     }

//     res.status(200).json({
//       success: true,
//       count: enrichedStaff.length,
//       staff: enrichedStaff,
//     });
//   } catch (error) {
//     console.error("Error fetching staff:", error);
//     res.status(500).json({success: false, message: "Error fetching staff"});
//   }
// };

// Get staff by ID
// export const getStaffById = async (req, res) => {
//   try {
//     const staffId = req.params.id;
//     const staff = await Staff.findById(staffId);

//     if (!staff) {
//       return res
//         .status(404)
//         .json({ success: false, message: "Staff not found" });
//     }

//     res.status(200).json({
//       success: true,
//       staff,
//     });
//   } catch (error) {
//     console.error("Error fetching staff:", error);
//     res.status(500).json({ success: false, message: "Error fetching staff" });
//   }
// };
export const getStaffById = async (req, res) => {
  try {
    const staff = await Staff.findById(req.params.id);

    if (!staff) {
      return res.status(404).json({
        success: false,
        message: "Staff not found.",
      });
    }

    const staffObject = staff.toObject();

    if (staff.propertyId && staff.propertyId.length > 0) {
      const propertyId = staff.propertyId[0];
      try {
        const propertyResponse = await axios.get(
          `${process.env.PROPERTY_SERVICE_URL}/property/${propertyId}`
        );

        if (propertyResponse?.data) {
          const propertyData = propertyResponse.data;
          staffObject.property = {
            _id: propertyData._id,
            name: propertyData.propertyName,
          };
        } else {
          staffObject.property = {name: "Property details not found"};
        }
      } catch (error) {
        console.error(
          `Failed to fetch property details for ID ${propertyId}:`,
          error.message
        );
        staffObject.property = {name: "Could not fetch property"};
      }
    }

    return res.status(200).json({
      success: true,
      message: "Staff retrieved successfully.",
      data: staffObject,
    });
  } catch (error) {
    console.error("Error during staff retrieval:", error);
    res.status(500).json({
      success: false,
      message: "An internal server error occurred.",
    });
  }
};

// Update staff
export const updateStaff = async (req, res) => {
  try {
    const staffId = req.params.id;
    const updateData = req.body;
    const files = req.files;
    console.log("Staff", updateData);

    const existingStaff = await Staff.findById(staffId);
    if (!existingStaff) {
      return res.status(404).json({
        success: false,
        message: "Staff not found",
      });
    }

    if (files) {
      if (files.photo && files.photo[0]) {
        if (existingStaff.photo) {
          await deleteFromFirebase(existingStaff.photo);
        }
        updateData.photo = await uploadToFirebase(
          files.photo[0],
          "staff-photos"
        );
      }

      if (files.aadharFrontImage && files.aadharFrontImage[0]) {
        if (existingStaff.aadharFrontImage) {
          await deleteFromFirebase(existingStaff.aadharFrontImage);
        }
        updateData.aadharFrontImage = await uploadToFirebase(
          files.aadharFrontImage[0],
          "staff-documents"
        );
      }

      if (files.aadharBackImage && files.aadharBackImage[0]) {
        if (existingStaff.aadharBackImage) {
          await deleteFromFirebase(existingStaff.aadharBackImage);
        }
        updateData.aadharBackImage = await uploadToFirebase(
          files.aadharBackImage[0],
          "staff-documents"
        );
      }
    }

    if (updateData.propertyId) {
      const propertyExists = await Property.findById(updateData.propertyId);
      if (!propertyExists) {
        return res.status(404).json({
          success: false,
          message: "Property not found",
        });
      }
    }

    const updatedStaff = await Staff.findByIdAndUpdate(staffId, updateData, {
      new: true,
      runValidators: true,
    });

    try {
      const adminName = req.headers["x-user-username"];
      const propertyName =
        (await Property.findById(updatedStaff.propertyId))?.propertyName ||
        "Unknown Property";

      await PropertyLog.create({
        propertyId: updatedStaff.propertyId,
        action: "update",
        category: "staff",
        changedByName: adminName,
        message: `Employee "${updatedStaff.name}" (Contact: ${updatedStaff.contactNumber}) details were updated in property "${propertyName}" by ${adminName}`,
      });
    } catch (logError) {
      console.error("Failed to save property log (updateStaff):", logError);
    }

    res.status(200).json({
      success: true,
      message: "Staff updated successfully",
      staff: updatedStaff,
    });
  } catch (error) {
    console.error("Error updating staff:", error);
    res.status(500).json({
      success: false,
      message: "Error updating staff",
      error: error.message,
    });
  }
};

// Delete staff
export const deleteStaff = async (req, res) => {
  try {
    const staffId = req.params.id;

    // Check if staff exists
    const staff = await Staff.findById(staffId);
    if (!staff) {
      return res.status(404).json({success: false, message: "Staff not found"});
    }

    // Delete staff
    await Staff.findByIdAndDelete(staffId);

    try {
      const adminName = req.headers["x-user-username"];
      const propertyName =
        (await Property.findById(staff.propertyId))?.propertyName ||
        "Unknown Property";

      await PropertyLog.create({
        propertyId: staff.propertyId,
        action: "delete",
        category: "staff",
        changedByName: adminName,
        message: `Employee "${staff.name}" (Contact: ${staff.contactNumber}) was removed from property "${propertyName}" by ${adminName}`,
      });
    } catch (logError) {
      console.error("Failed to save property log (deleteStaff):", logError);
    }

    res.status(200).json({
      success: true,
      message: "Staff deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting staff:", error);
    res.status(500).json({success: false, message: "Error deleting staff"});
  }
};

export const staffStatusChange = async (req, res) => {
  try {
    const staffId = req.params.id;

    const staff = await Staff.findById(staffId);
    if (!staff) {
      return res.status(404).json({
        success: false,
        message: "Staff not found",
      });
    }

    const oldStatus = staff.status;
    staff.status = oldStatus === "Active" ? "Inactive" : "Active";
    await staff.save();

    try {
      const adminName = req.headers["x-user-username"];
      const propertyName =
        (await Property.findById(staff.propertyId))?.propertyName ||
        "Unknown Property";

      await PropertyLog.create({
        propertyId: staff.propertyId,
        action: staff.status === "Active" ? "active_status" : "inactive_status",
        category: "staff",
        changedByName: adminName,
        message: `Employee "${staff.name}" (Contact: ${staff.contactNumber}) status changed from "${oldStatus}" to "${staff.status}" for property "${propertyName}" by ${adminName}`,
      });
    } catch (logError) {
      console.error(
        "Failed to save property log (staffStatusChange):",
        logError
      );
    }

    res.status(200).json({
      success: true,
      message: `Staff status updated to ${staff.status}`,
    });
  } catch (error) {
    console.error("Error updating staff status:", error);
    res.status(500).json({
      success: false,
      message: "Error updating staff status",
      error: error.message,
    });
  }
};

export const getStaffByPropertyId = async (req, res) => {
  try {
    const {propertyId} = req.params;

    // Validate propertyId
    if (!mongoose.Types.ObjectId.isValid(propertyId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid property ID format",
      });
    }

    // Check if property exists
    const propertyExists = await Property.findById(propertyId);
    if (!propertyExists) {
      return res.status(404).json({
        success: false,
        message: "Property not found",
      });
    }

    // Find staff assigned to this property
    const staffMembers = await Staff.find({
      propertyId: {$in: [propertyId]},
      deleted: false,
      propertyId: {$in: [propertyId]},
      deleted: false,
    });

    // Enrich staff data with role names
    const enrichedStaff = await Promise.all(
      staffMembers.map(async (staff) => {
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

    res.status(200).json({
      success: true,
      count: enrichedStaff.length,
      staff: enrichedStaff,
    });
  } catch (error) {
    console.error("Error fetching staff by property:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching staff by property",
      error: error.message,
    });
  }
};
