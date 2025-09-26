// import { uploadToFirebase } from "../../../../libs/common/imageOperation.js";
// import { Maintenance } from "../models/maintenance.model.js";
// import { ApiError } from "../utils/ApiError.js";
// import mongoose from "mongoose";

// class MaintenanceService {
//   /**
//    * Get maintenane record for a property
//    * @param {string} propertyId - Property ID
//    * @param {string} status - optional filters: {Pending, Ongoing, Resolved}
//    * @returns {Promise<object>} - Maintenance record
//    * @throws {ApiError} - If maintenance not found
//    */
//   async getMaintenanceByPropertyId(propertyId, filters = {}) {
//     // console.log("--- Service function has been called ---"); // debug log
//     // Validate Property ID
//     this.#validateIds(propertyId, "Property ID");

//     const matchStage = {
//       propertyId: new mongoose.Types.ObjectId(propertyId),
//     };

//     // console.log("Match stage:", matchStage); // debug log

//     // Filter: status
//     const validStatuses = ["Pending", "Ongoing", "Resolved"];
//     if (filters.status) {
//       const normalizedStatus =
//         filters.status.charAt(0).toUpperCase() +
//         filters.status.slice(1).toLowerCase();

//       if (!validStatuses.includes(normalizedStatus)) {
//         throw new ApiError(400, "Invalid status filter");
//       }

//       matchStage.status = normalizedStatus;
//     }

//     // Pagination defaults
//     const page = parseInt(filters.page) > 0 ? parseInt(filters.page) : 1;
//     const limit = parseInt(filters.limit) > 0 ? parseInt(filters.limit) : 10;
//     const skip = (page - 1) * limit;

//     const aggregationPipeline = [
//       { $match: matchStage },
//       {
//         $lookup: {
//           from: "staffs",
//           localField: "assignedStaffId",
//           foreignField: "_id",
//           as: "staffInfo",
//         },
//       },
//       {
//         $unwind: {
//           path: "$staffInfo",
//           preserveNullAndEmptyArrays: true,
//         },
//       },
//       {
//         $addFields: {
//           staffName: "$staffInfo.name",
//         },
//       },
//       {
//         $project: {
//           staffInfo: 0,
//         },
//       },
//       {
//         $sort: { createdAt: -1 },
//       },
//       {
//         $facet: {
//           data: [{ $skip: skip }, { $limit: limit }],
//           totalCount: [{ $count: "count" }],
//         },
//       },
//     ];

//     const result = await Maintenance.aggregate(aggregationPipeline);

//     // console.log("Aggregation result:", JSON.stringify(result, null, 2)); // debug log

//     const data = result[0]?.data || [];
//     const total = result[0]?.totalCount[0]?.count || 0;

//     return {
//       data,
//       pagination: {
//         total,
//         page,
//         limit,
//         totalPages: Math.ceil(total / limit),
//       },
//     };
//   }

//   /**
//    * Get a specific maintenane record
//    * @param {string} propertyId - Maintenance ID
//    * @returns {Promise<object>} - Maintenance record
//    * @throws {ApiError} - If maintenance not found
//    */
//   async getMaintenanceRecord(maintenanceId) {
//     // Check validations
//     this.#validateIds(maintenanceId, "Maintenance ID");

//     // Aggregation pipeline
//     const [record] = await Maintenance.aggregate([
//       {
//         $match: {
//           _id: new mongoose.Types.ObjectId(maintenanceId),
//         },
//       },
//       {
//         $lookup: {
//           from: "staffs", // Collection name in MongoDB
//           localField: "assignedStaffId",
//           foreignField: "_id",
//           as: "staffInfo",
//         },
//       },
//       {
//         $unwind: {
//           path: "$staffInfo",
//           preserveNullAndEmptyArrays: true,
//         },
//       },
//       {
//         $addFields: {
//           staffName: "$staffInfo.name",
//         },
//       },
//       {
//         $project: {
//           staffInfo: 0, // Exclude the full staffInfo object if only name is needed
//         },
//       },
//     ]);

//     if (!record) {
//       throw new ApiError(400, "Maintenance Record not found");
//     }
//     return record;
//   }

//   /**
//    * Get all maintenane records by a user
//    * @param {string} userId - User ID
//    * @param {string} status - optional filters: {Pending, Ongoing, Resolved}
//    * @returns {Promise<object>} - Maintenance records
//    * @throws {ApiError} - If maintenance not found
//    */
//   async getAllMaintenanceRecordsByUser(userId, filters = {}) {
//     // Check validations
//     this.#validateIds(userId, "User iD");

//     const matchStage = {
//       reportedBy: new mongoose.Types.ObjectId(userId),
//     };

//     // console.log("Match stage:", matchStage); // debug log

//     // Filter: status
//     const validStatuses = ["Pending", "Ongoing", "Resolved"];
//     if (filters.status) {
//       const normalizedStatus =
//         filters.status.charAt(0).toUpperCase() +
//         filters.status.slice(1).toLowerCase();

//       if (!validStatuses.includes(normalizedStatus)) {
//         throw new ApiError(400, "Invalid status filter");
//       }

//       matchStage.status = normalizedStatus;
//     }

//     // Pagination defaults
//     const page = parseInt(filters.page) > 0 ? parseInt(filters.page) : 1;
//     const limit = parseInt(filters.limit) > 0 ? parseInt(filters.limit) : 10;
//     const skip = (page - 1) * limit;

//     const aggregationPipeline = [
//       { $match: matchStage },
//       {
//         $lookup: {
//           from: "staffs",
//           localField: "assignedStaffId",
//           foreignField: "_id",
//           as: "staffInfo",
//         },
//       },
//       {
//         $unwind: {
//           path: "$staffInfo",
//           preserveNullAndEmptyArrays: true,
//         },
//       },
//       {
//         $addFields: {
//           staffName: "$staffInfo.name",
//         },
//       },
//       {
//         $project: {
//           staffInfo: 0,
//         },
//       },
//       {
//         $sort: { createdAt: -1 },
//       },
//       {
//         $facet: {
//           data: [{ $skip: skip }, { $limit: limit }],
//           totalCount: [{ $count: "count" }],
//         },
//       },
//     ];

//     const result = await Maintenance.aggregate(aggregationPipeline);

//     // console.log("Aggregation result:", JSON.stringify(result, null, 2)); // debug log

//     const data = result[0]?.data || [];
//     const total = result[0]?.totalCount[0]?.count || 0;

//     return {
//       data,
//       pagination: {
//         total,
//         page,
//         limit,
//         totalPages: Math.ceil(total / limit),
//       },
//     };
//   }

//   /**
//    * Create a new maintenance record
//    * @param {string} data - Property ID
//    * @returns {Promise<object>} - Created Maintenance record
//    * @throws {ApiError} - If validation fails or DB error occurs.
//    */
//   async createMaintenance(data, files) {
//     this.#validateRequiredFields(data);

//     try {
//       const maintenanceData = { ...data };
//       let issueImageUrl = null;

//       if (files) {
//         if (files.issueImage && files.issueImage[0]) {
//           console.log("Uploading photo...");
//           issueImageUrl = await uploadToFirebase(
//             files.issueImage[0],
//             "issue-image"
//           );
//           console.log("Photo uploaded to:", issueImageUrl);
//           maintenanceData.issueImage = issueImageUrl;
//         }
//       }

//       const maintenanceRecords = await Maintenance.create(maintenanceData);

//       return maintenanceRecords;
//     } catch (error) {
//       throw new ApiError(400, "Failed to create maintenance records", error);
//     }
//   }

//   /**
//    * Assign staff to a maintenance request and return updated record with staff name.
//    * @param {string} maintenanceId - ID of the maintenance record
//    * @param {string} staffId - ID of the staff to assign
//    * @returns {Promise<object>} - Updated maintenance record with staff details
//    * @throws {ApiError} - If inputs are invalid or update fails
//    */

//   async assignStaffToMaintenance(maintenanceId, staffId, timeNeeded) {
//     // Checking validations
//     this.#validateIds(maintenanceId, "Maintenance ID");
//     this.#validateIds(staffId, "Staff ID");

//     // update records
//     const record = await Maintenance.findById(maintenanceId);

//     if (!record) {
//       throw new ApiError(400, "Maintenance Record not found");
//     }

//     if (record.status === "Resolved") {
//       throw new ApiError(
//         400,
//         "Cannot assign staff to a resolved maintenance record."
//       );
//     }

//     if (record.assignedStaffId) {
//       throw new ApiError(
//         400,
//         "Staff has already been assigned to this maintenance record."
//       );
//     }

//     if (record) {
//       record.assignedStaffId = staffId;
//       record.acceptedAt = new Date();
//       record.status = "Ongoing";
//       record.timeNeeded = timeNeeded;
//     }

//     await record.save();

//     // aggregation pipeline
//     const [recordWithStaffDetails] = await Maintenance.aggregate([
//       { $match: { _id: new mongoose.Types.ObjectId(maintenanceId) } },
//       {
//         $lookup: {
//           from: "staffs", // Must match actual collection name in MongoDB
//           localField: "assignedStaffId",
//           foreignField: "_id",
//           as: "staffInfo",
//         },
//       },
//       {
//         $unwind: {
//           path: "$staffInfo",
//           preserveNullAndEmptyArrays: true,
//         },
//       },
//       {
//         $addFields: {
//           staffName: "$staffInfo.name", // Add just the name from staff
//         },
//       },
//       {
//         $project: {
//           staffInfo: 0, // Optional: remove staffInfo array from response
//         },
//       },
//     ]);

//     return recordWithStaffDetails;
//   }

//   /**
//    * Mark an ongoing maintenance record as resolved
//    * @param {string} maintenanceId - ID of the maintenance record
//    * @returns {Promise<object>} - Updated maintenance record with staff details
//    * @throws {ApiError} - If inputs are invalid or update fails
//    */
//   async markAsResolved(maintenanceId, remarks = null) {
//     // Check validations
//     this.#validateIds(maintenanceId, "Maintenance ID");

//     // Update records as resolved
//     const record = await Maintenance.findById(maintenanceId);

//     if (!record) {
//       throw new ApiError(400, "Maintenance record not found");
//     }

//     if (record.status === "Resolved") {
//       throw new ApiError(400, "This Maintenance record is already resolved");
//     }

//     if (record.status !== "Ongoing") {
//       throw new ApiError(
//         400,
//         `Cannot resolve a maintenance record with status "${record.status}". Only "Ongoing" records can be resolved.`
//       );
//     }

//     record.status = "Resolved";
//     record.resolvedAt = new Date();
//     record.remarks = remarks ?? null; // if undefined, set to null
//     await record.save();

//     // aggregation pipeline
//     const [resolvedRecordWithStaffdetails] = await Maintenance.aggregate([
//       { $match: { _id: new mongoose.Types.ObjectId(maintenanceId) } },
//       {
//         $lookup: {
//           from: "staffs", // Must match actual collection name in MongoDB
//           localField: "assignedStaffId",
//           foreignField: "_id",
//           as: "staffInfo",
//         },
//       },
//       {
//         $unwind: {
//           path: "$staffInfo",
//           preserveNullAndEmptyArrays: true,
//         },
//       },
//       {
//         $addFields: {
//           staffName: "$staffInfo.name", // Add just the name from staff
//         },
//       },
//       {
//         $project: {
//           staffInfo: 0, // Optional: remove staffInfo array from response
//         },
//       },
//     ]);

//     return resolvedRecordWithStaffdetails;
//   }

//   // ------ Private Menthos ------ //

//   // Helper function to validate required fields
//   #validateRequiredFields(data) {
//     const requiredFields = [
//       "reportedBy",
//       "userName",
//       "issue",
//       "description",
//       "propertyId",
//     ];

//     const missingFields = requiredFields.filter((field) => !data[field]);

//     if (missingFields.length > 0) {
//       throw new ApiError(
//         400,
//         `Missing required fields: ${missingFields.join(", ")}`,
//         missingFields.map((field) => ({
//           field,
//           message: `${field} is required`,
//         }))
//       );
//     }
//   }

//   // Helper function to validate Ids
//   #validateIds(id, fieldName) {
//     if (!id) {
//       throw new ApiError(400, `${fieldName} is required`);
//     }

//     if (!mongoose.Types.ObjectId.isValid(id)) {
//       throw new ApiError(400, `Invalid ${fieldName} format`);
//     }
//   }
// }

// export const maintenanceService = new MaintenanceService();
import { Maintenance } from "../models/maintenance.model.js";
import Property from "../models/property.model.js";
import mongoose from "mongoose";
import { uploadToFirebase } from "../../../../libs/common/imageOperation.js";
import { sendRPCRequest } from "../../../../libs/common/rabbitMq.js";
import { SOCKET_PATTERN } from "../../../../libs/patterns/socket/socket.pattern.js";

// Helper function to validate required fields
const validateRequiredFields = (data) => {
  const requiredFields = [
    "reportedBy",
    "userName",
    "issue",
    "description",
    "propertyId",
  ];
  const missingFields = requiredFields.filter((field) => !data[field]);
  if (missingFields.length > 0) {
    throw new Error(`Missing required fields: ${missingFields.join(", ")}`);
  }
};

// Helper function to validate Ids
const validateIds = (id, fieldName) => {
  if (!id) {
    throw new Error(`${fieldName} is required`);
  }
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error(`Invalid ${fieldName} format`);
  }
};

export const createMaintenance = async (data) => {
  try {
    const { payload, files } = data;
    validateRequiredFields(payload);

    const maintenanceData = { ...payload };

    if (files && files.issueImage) {
      const imageBuffer = Buffer.from(files.issueImage.buffer, "base64");
      const issueImageUrl = await uploadToFirebase(
        { buffer: imageBuffer, originalname: files.issueImage.originalname },
        "issue-images"
      );
      maintenanceData.issueImage = issueImageUrl;
    }

    const maintenanceRecord = await Maintenance.create(maintenanceData);

    // After creation, trigger socket notification via RPC
    try {
      const property = await Property.findById(
        maintenanceRecord?.propertyId
      ).lean();
      const userIdsToNotify = ["688722e075ee06d71c8fdb02"]; // Admin ID
      if (property && property.clientId) {
        userIdsToNotify.push(property.clientId.toString());
      }

      await sendRPCRequest(SOCKET_PATTERN.EMIT_EVENT, {
        userIds: userIdsToNotify,
        event: "new-maintenance",
        data: maintenanceRecord,
      });
    } catch (socketError) {
      // Log the error but don't fail the whole operation
      console.error(
        "Failed to emit socket event for new maintenance:",
        socketError
      );
    }

    return {
      success: true,
      status: 201,
      message: "Maintenance record added successfully.",
      data: maintenanceRecord,
    };
  } catch (error) {
    console.error("Error creating maintenance record:", error);
    return {
      success: false,
      status: 400,
      message: error.message || "Failed to create maintenance record.",
    };
  }
};

export const getMaintenanceByPropertyId = async (data) => {
  try {
    const { propertyId, filters = {} } = data;
    validateIds(propertyId, "Property ID");

    const matchStage = {
      propertyId: new mongoose.Types.ObjectId(propertyId),
    };

    const validStatuses = ["Pending", "Ongoing", "Resolved"];
    if (filters.status && validStatuses.includes(filters.status)) {
      matchStage.status = filters.status;
    }

    const page = parseInt(filters.page) || 1;
    const limit = parseInt(filters.limit) || 10;
    const skip = (page - 1) * limit;

    const aggregationPipeline = [
      { $match: matchStage },
      {
        $lookup: {
          from: "staffs",
          localField: "assignedStaffId",
          foreignField: "_id",
          as: "staffInfo",
        },
      },
      { $unwind: { path: "$staffInfo", preserveNullAndEmptyArrays: true } },
      { $addFields: { staffName: "$staffInfo.name" } },
      { $project: { staffInfo: 0 } },
      { $sort: { createdAt: -1 } },
      {
        $facet: {
          data: [{ $skip: skip }, { $limit: limit }],
          totalCount: [{ $count: "count" }],
        },
      },
    ];

    const result = await Maintenance.aggregate(aggregationPipeline);
    const records = result[0]?.data || [];
    const total = result[0]?.totalCount[0]?.count || 0;

    return {
      success: true,
      status: 200,
      message: "Maintenance records retrieved successfully.",
      data: {
        data: records,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      },
    };
  } catch (error) {
    console.error("Error getting maintenance by property:", error);
    return {
      success: false,
      status: 500,
      message: error.message || "Server error.",
    };
  }
};

export const assignStaffToMaintenance = async (data) => {
  try {
    const { maintenanceId, staffId, timeNeeded } = data;
    validateIds(maintenanceId, "Maintenance ID");
    validateIds(staffId, "Staff ID");

    const record = await Maintenance.findById(maintenanceId);
    if (!record)
      return {
        success: false,
        status: 404,
        message: "Maintenance Record not found",
      };
    if (record.status === "Resolved")
      return {
        success: false,
        status: 400,
        message: "Cannot assign staff to a resolved record.",
      };
    if (record.assignedStaffId)
      return {
        success: false,
        status: 400,
        message: "Staff has already been assigned.",
      };

    record.assignedStaffId = staffId;
    record.acceptedAt = new Date();
    record.status = "Ongoing";
    record.timeNeeded = timeNeeded;
    await record.save();

    const updatedRecord = await getMaintenanceRecord({ maintenanceId });

    return {
      success: true,
      status: 200,
      message: "Staff assigned successfully.",
      data: updatedRecord.data,
    };
  } catch (error) {
    console.error("Error assigning staff:", error);
    return {
      success: false,
      status: 500,
      message: error.message || "Server error.",
    };
  }
};

export const markAsResolved = async (data) => {
  try {
    const { maintenanceId, remarks } = data;
    validateIds(maintenanceId, "Maintenance ID");

    const record = await Maintenance.findById(maintenanceId);
    if (!record)
      return {
        success: false,
        status: 404,
        message: "Maintenance record not found",
      };
    if (record.status === "Resolved")
      return {
        success: false,
        status: 400,
        message: "Record is already resolved.",
      };
    if (record.status !== "Ongoing")
      return {
        success: false,
        status: 400,
        message: `Cannot resolve a record with status "${record.status}".`,
      };

    record.status = "Resolved";
    record.resolvedAt = new Date();
    record.remarks = remarks || null;
    await record.save();

    const updatedRecord = await getMaintenanceRecord({ maintenanceId });

    return {
      success: true,
      status: 200,
      message: "Marked as resolved successfully.",
      data: updatedRecord.data,
    };
  } catch (error) {
    console.error("Error marking as resolved:", error);
    return {
      success: false,
      status: 500,
      message: error.message || "Server error.",
    };
  }
};

export const getMaintenanceRecord = async (data) => {
  try {
    const { maintenanceId } = data;
    validateIds(maintenanceId, "Maintenance ID");

    const [record] = await Maintenance.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId(maintenanceId) } },
      {
        $lookup: {
          from: "staffs",
          localField: "assignedStaffId",
          foreignField: "_id",
          as: "staffInfo",
        },
      },
      { $unwind: { path: "$staffInfo", preserveNullAndEmptyArrays: true } },
      { $addFields: { staffName: "$staffInfo.name" } },
      { $project: { staffInfo: 0 } },
    ]);

    if (!record)
      return {
        success: false,
        status: 404,
        message: "Maintenance Record not found",
      };

    return {
      success: true,
      status: 200,
      message: "Record retrieved successfully.",
      data: record,
    };
  } catch (error) {
    console.error("Error getting maintenance record:", error);
    return {
      success: false,
      status: 500,
      message: error.message || "Server error.",
    };
  }
};

export const getAllMaintenanceRecordsByUser = async (data) => {
  try {
    const { userId, filters = {} } = data;
    validateIds(userId, "User ID");
    const matchStage = {
      reportedBy: new mongoose.Types.ObjectId(userId),
    };

    // console.log("Match stage:", matchStage); // debug log

    // Filter: status
    const validStatuses = ["Pending", "Ongoing", "Resolved"];
    if (filters.status) {
      const normalizedStatus =
        filters.status.charAt(0).toUpperCase() +
        filters.status.slice(1).toLowerCase();

      if (!validStatuses.includes(normalizedStatus)) {
        throw new ApiError(400, "Invalid status filter");
      }

      matchStage.status = normalizedStatus;
    }

    // Pagination defaults
    const page = parseInt(filters.page) > 0 ? parseInt(filters.page) : 1;
    const limit = parseInt(filters.limit) > 0 ? parseInt(filters.limit) : 10;
    const skip = (page - 1) * limit;

    const aggregationPipeline = [
      { $match: matchStage },
      {
        $lookup: {
          from: "staffs",
          localField: "assignedStaffId",
          foreignField: "_id",
          as: "staffInfo",
        },
      },
      {
        $unwind: {
          path: "$staffInfo",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          staffName: "$staffInfo.name",
        },
      },
      {
        $project: {
          staffInfo: 0,
        },
      },
      {
        $sort: { createdAt: -1 },
      },
      {
        $facet: {
          data: [{ $skip: skip }, { $limit: limit }],
          totalCount: [{ $count: "count" }],
        },
      },
    ];

    const result = await Maintenance.aggregate(aggregationPipeline);

    // console.log("Aggregation result:", JSON.stringify(result, null, 2)); // debug log

    const data = result[0]?.data || [];
    const total = result[0]?.totalCount[0]?.count || 0;

    return {
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    return {
      success: false,
      status: 500,
      message: error.message || "Server error.",
    };
  }
};

export const getAllMaintenance = async () => {
  try {
    const maintenanceRecords = await Maintenance.find()
      .populate("propertyId", "propertyName")
      .populate("reportedBy", "name email");
    return {
      success: true,
      status: 200,
      message: "All records retrieved.",
      data: maintenanceRecords,
    };
  } catch (error) {
    return {
      success: false,
      status: 500,
      message: error.message || "Server error.",
    };
  }
};

export const updateMaintenance = async (data) => {
  try {
    const { maintenanceId, updateData } = data;
    validateIds(maintenanceId, "Maintenance ID");
    const updatedRecord = await Maintenance.findByIdAndUpdate(
      maintenanceId,
      updateData,
      { new: true }
    );
    if (!updatedRecord)
      return { success: false, status: 404, message: "Record not found." };
    return {
      success: true,
      status: 200,
      message: "Record updated.",
      data: updatedRecord,
    };
  } catch (error) {
    return {
      success: false,
      status: 400,
      message: error.message || "Update failed.",
    };
  }
};

export const deleteMaintenance = async (data) => {
  try {
    const { maintenanceId } = data;
    validateIds(maintenanceId, "Maintenance ID");
    const deletedRecord = await Maintenance.findByIdAndDelete(maintenanceId);
    if (!deletedRecord)
      return { success: false, status: 404, message: "Record not found." };
    return {
      success: true,
      status: 200,
      message: "Record deleted successfully.",
    };
  } catch (error) {
    return {
      success: false,
      status: 500,
      message: error.message || "Deletion failed.",
    };
  }
};

export const getLatestMaintenanceData = async (data) => {
  const { propertyId } = data;
  const filter = {};
  if (propertyId) {
    filter.propertyId = propertyId;
  }

  const [count, latest] = await Promise.all([
    Maintenance.countDocuments({ ...filter, status: "Pending" }),

    Maintenance.find(filter).sort({ createdAt: -1 }).limit(4).lean(),
  ]);

  return { count, latest };
};
