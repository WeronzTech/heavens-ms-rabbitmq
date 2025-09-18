import Property from "../models/property.model.js";
import PropertyLog from "../models/propertyLog.model.js";
import Staff from "../models/staff.model.js";
import axios from "axios";
import mongoose from "mongoose";

// import { getAllStaff } from "../services/staff.service.js";
import { PROPERTY_PATTERN } from "../../../../libs/patterns/property/property.pattern.js";
import { createResponder } from "../../../../libs/common/rabbitMq.js";
import {
  deleteStaff,
  getStaffById,
  getStaffByPropertyId,
  staffStatusChange,
} from "../services/staff.service.js";
import { uploadToFirebase } from "../../../../libs/common/imageOperation.js";

// createResponder(PROPERTY_PATTERN.STAFF.GET_ALL_STAFF, async (data) => {
//   return await getAllStaff(data);
// });

createResponder(PROPERTY_PATTERN.STAFF.GET_STAFF_BY_ID, async (data) => {
  return await getStaffById(data);
});

createResponder(PROPERTY_PATTERN.STAFF.DELETE_STAFF, async (data) => {
  return await deleteStaff(data);
});

createResponder(PROPERTY_PATTERN.STAFF.STAFF_STATUS_CHANGE, async (data) => {
  return await staffStatusChange(data);
});

createResponder(
  PROPERTY_PATTERN.STAFF.GET_STAFF_BY_PROPERTYID,
  async (data) => {
    return await getStaffByPropertyId(data);
  }
);

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
