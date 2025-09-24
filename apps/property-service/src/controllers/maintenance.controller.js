// import { Maintenance } from "../models/maintenance.model.js";
// import Property from "../models/property.model.js";
// import Staff from "../models/staff.model.js";
// import mongoose from "mongoose";
// import { maintenanceService } from "../services/maintenance.service.js";
// import { asyncHandler } from "../utils/asyncHandler.js";
// import { ApiResponse } from "../utils/ApiResponse.js";
// import { ApiError } from "../utils/ApiError.js";
// import axios from "axios";

// // Create a new maintenance record
// export const createMaintenance = asyncHandler(async (req, res) => {
//   const data = req.body;
//   console.log(data);
//   const files = req.files;

//   const maintenanceRecord = await maintenanceService.createMaintenance(
//     data,
//     files
//   );

//   if (maintenanceRecord.length === 0) {
//     return res
//       .status(200)
//       .json(
//         new ApiResponse(
//           200,
//           [],
//           "No maintenance record found for this property."
//         )
//       );
//   }

//   const property = await Property.findById(
//     maintenanceRecord?.propertyId
//   ).lean();

//   // 3. Create an array of user IDs to notify
//   const userIdsToNotify = [
//     "688722e075ee06d71c8fdb02", // The admin's ID
//   ];

//   if (property && property.clientId) {
//     userIdsToNotify.push(property.clientId.toString());
//   }

//   const socketServiceUrl = `${process.env.SOCKET_SERVICE_URL}/internalSocket/emit`;

//   await axios.post(socketServiceUrl, {
//     userIds: userIdsToNotify,
//     event: "new-maintenance",
//     data: maintenanceRecord,
//   });

//   return res
//     .status(200)
//     .json(
//       new ApiResponse(
//         200,
//         maintenanceRecord,
//         "Maintenance record added successfully."
//       )
//     );
// });

// // Fetch all maintenance records for a specific property
// export const getMaintenanceByProperty = asyncHandler(async (req, res) => {
//   const { propertyId } = req.params;
//   const filters = req.query;

//   // console.log(`filters`, filters); // debug log

//   const records = await maintenanceService.getMaintenanceByPropertyId(
//     propertyId,
//     filters
//   );

//   // console.log("Fetched Maintenance Records:", JSON.stringify(records, null, 2)); // debug log

//   return res
//     .status(200)
//     .json(
//       new ApiResponse(
//         200,
//         records,
//         "Maintenance records retrieved successfully"
//       )
//     );
// });

// // Assign staff to a maintenance record
// export const assignStaffToMaintenance = asyncHandler(async (req, res) => {
//   const { maintenanceId } = req.params;
//   const { staffId, timeNeeded } = req.body;

//   const updatedRecord = await maintenanceService.assignStaffToMaintenance(
//     maintenanceId,
//     staffId,
//     timeNeeded
//   );

//   if (!updatedRecord) {
//     throw new ApiError(500, "Failed to retrieve updated maintenance record");
//   }

//   return res
//     .status(200)
//     .json(new ApiResponse(200, updatedRecord, "Staff assigned successfully."));
// });

// // Mark a maintenance record as resolved
// export const markAsResolved = asyncHandler(async (req, res) => {
//   const { maintenanceId } = req.params;
//   const { remarks = null } = req.body || {};

//   const record = await maintenanceService.markAsResolved(
//     maintenanceId,
//     remarks
//   );

//   return res
//     .status(200)
//     .json(
//       new ApiResponse(200, record, "Maintenance record marked as resolved.")
//     );
// });

// // Fetch a single Maintenance record by ID
// export const getMaintenanceById = asyncHandler(async (req, res) => {
//   const { maintenanceId } = req.params;

//   const record = await maintenanceService.getMaintenanceRecord(maintenanceId);
//   return res
//     .status(200)
//     .json(
//       new ApiResponse(200, record, "Maintenance record retrieved successfully.")
//     );
// });

// // Fetch all maintenance records by a specific user
// export const getMaintenanceByUserId = asyncHandler(async (req, res) => {
//   const { userId } = req.params;
//   const filters = req.query;

//   const records = await maintenanceService.getAllMaintenanceRecordsByUser(
//     userId,
//     filters
//   );

//   return res
//     .status(200)
//     .json(
//       new ApiResponse(
//         200,
//         records,
//         "Maintenance records retrieved successfully"
//       )
//     );
// });

// export const getAllMaintanance = async (req, res) => {
//   try {
//     const maintananceRecords = await Maintanance.find()
//       .populate("property", "name") // Only populate property name if needed
//       .populate("createdBy", "name email"); // Only populate creator name/email if needed

//     res.status(200).json({
//       success: true,
//       count: maintananceRecords.length,
//       maintanance: maintananceRecords,
//     });
//   } catch (error) {
//     console.error("Error fetching maintenance records:", error);
//     res.status(500).json({
//       success: false,
//       message: "Error fetching maintenance records",
//     });
//   }
// };

// export const updateMaintanance = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const updateData = req.body;

//     // Find existing record
//     const existingRecord = await Maintenance.findById(id);
//     if (!existingRecord) {
//       return res.status(404).json({
//         success: false,
//         message: "Maintenance record not found",
//       });
//     }

//     // Validate property ID if it's being updated
//     if (
//       updateData.property &&
//       !mongoose.Types.ObjectId.isValid(updateData.property)
//     ) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid property ID format",
//       });
//     }

//     // Update only provided fields (maintain null for unspecified fields)
//     const updatedFields = {
//       propertyname: updateData.propertyname ?? existingRecord.propertyname,
//       property: updateData.property
//         ? new mongoose.Types.ObjectId(updateData.property)
//         : existingRecord.property,
//       name: updateData.name ?? existingRecord.name,
//       roomNo: updateData.roomNo ?? existingRecord.roomNo,
//       issue: updateData.issue ?? existingRecord.issue,
//       description: updateData.description ?? existingRecord.description,
//       issueImage: updateData.issueImage ?? existingRecord.issueImage,
//       createdBy: updateData.createdBy ?? existingRecord.createdBy,
//       assignedTo: updateData.assignedTo ?? existingRecord.assignedTo,
//       timeNeeded: updateData.timeNeeded ?? existingRecord.timeNeeded,
//       acceptedTime: updateData.acceptedTime ?? existingRecord.acceptedTime,
//       resolvedTime: updateData.resolvedTime ?? existingRecord.resolvedTime,
//     };

//     const updatedRecord = await Maintanance.findByIdAndUpdate(
//       id,
//       updatedFields,
//       { new: true, runValidators: true }
//     );

//     res.status(200).json({
//       success: true,
//       message: "Maintenance record updated successfully",
//       maintanance: updatedRecord,
//     });
//   } catch (error) {
//     console.error("Error updating maintenance:", error);
//     res.status(500).json({
//       success: false,
//       message: "Error updating maintenance record",
//       error: error.message,
//     });
//   }
// };

// export const deleteMaintanance = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const deletedRecord = await Maintanance.findByIdAndDelete(id);

//     if (!deletedRecord) {
//       return res.status(404).json({
//         success: false,
//         message: "Maintenance record not found",
//       });
//     }

//     res.status(200).json({
//       success: true,
//       message: "Maintenance record deleted successfully",
//     });
//   } catch (error) {
//     console.error("Error deleting maintenance:", error);
//     res.status(500).json({
//       success: false,
//       message: "Error deleting maintenance record",
//     });
//   }
// };
import { createResponder } from "../../../../libs/common/rabbitMq.js";
import { PROPERTY_PATTERN } from "../../../../libs/patterns/property/property.pattern.js";
import {
  createMaintenance,
  getMaintenanceByPropertyId,
  assignStaffToMaintenance,
  markAsResolved,
  getMaintenanceRecord,
  getAllMaintenanceRecordsByUser,
  getAllMaintenance,
  updateMaintenance,
  deleteMaintenance,
} from "../services/maintenance.service.js";

createResponder(PROPERTY_PATTERN.MAINTENANCE.CREATE, createMaintenance);
createResponder(
  PROPERTY_PATTERN.MAINTENANCE.GET_BY_PROPERTY,
  getMaintenanceByPropertyId
);
createResponder(
  PROPERTY_PATTERN.MAINTENANCE.ASSIGN_STAFF,
  assignStaffToMaintenance
);
createResponder(PROPERTY_PATTERN.MAINTENANCE.MARK_RESOLVED, markAsResolved);
createResponder(PROPERTY_PATTERN.MAINTENANCE.GET_BY_ID, getMaintenanceRecord);
createResponder(
  PROPERTY_PATTERN.MAINTENANCE.GET_BY_USER,
  getAllMaintenanceRecordsByUser
);
createResponder(PROPERTY_PATTERN.MAINTENANCE.GET_ALL, getAllMaintenance);
createResponder(PROPERTY_PATTERN.MAINTENANCE.UPDATE, updateMaintenance);
createResponder(PROPERTY_PATTERN.MAINTENANCE.DELETE, deleteMaintenance);
