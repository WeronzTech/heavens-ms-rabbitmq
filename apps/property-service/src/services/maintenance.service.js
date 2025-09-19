import { uploadToFirebase } from "../../../../libs/common/imageOperation.js";
import { Maintenance } from "../models/maintenance.model.js";
import { ApiError } from "../utils/ApiError.js";
import mongoose from "mongoose";

class MaintenanceService {
  /**
   * Get maintenane record for a property
   * @param {string} propertyId - Property ID
   * @param {string} status - optional filters: {Pending, Ongoing, Resolved}
   * @returns {Promise<object>} - Maintenance record
   * @throws {ApiError} - If maintenance not found
   */
  async getMaintenanceByPropertyId(propertyId, filters = {}) {
    // console.log("--- Service function has been called ---"); // debug log
    // Validate Property ID
    this.#validateIds(propertyId, "Property ID");

    const matchStage = {
      propertyId: new mongoose.Types.ObjectId(propertyId),
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
  }

  /**
   * Get a specific maintenane record
   * @param {string} propertyId - Maintenance ID
   * @returns {Promise<object>} - Maintenance record
   * @throws {ApiError} - If maintenance not found
   */
  async getMaintenanceRecord(maintenanceId) {
    // Check validations
    this.#validateIds(maintenanceId, "Maintenance ID");

    // Aggregation pipeline
    const [record] = await Maintenance.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(maintenanceId),
        },
      },
      {
        $lookup: {
          from: "staffs", // Collection name in MongoDB
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
          staffInfo: 0, // Exclude the full staffInfo object if only name is needed
        },
      },
    ]);

    if (!record) {
      throw new ApiError(400, "Maintenance Record not found");
    }
    return record;
  }

  /**
   * Get all maintenane records by a user
   * @param {string} userId - User ID
   * @param {string} status - optional filters: {Pending, Ongoing, Resolved}
   * @returns {Promise<object>} - Maintenance records
   * @throws {ApiError} - If maintenance not found
   */
  async getAllMaintenanceRecordsByUser(userId, filters = {}) {
    // Check validations
    this.#validateIds(userId, "User iD");

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
  }

  /**
   * Create a new maintenance record
   * @param {string} data - Property ID
   * @returns {Promise<object>} - Created Maintenance record
   * @throws {ApiError} - If validation fails or DB error occurs.
   */
  async createMaintenance(data, files) {
    this.#validateRequiredFields(data);

    try {
      const maintenanceData = { ...data };
      let issueImageUrl = null;

      if (files) {
        if (files.issueImage && files.issueImage[0]) {
          console.log("Uploading photo...");
          issueImageUrl = await uploadToFirebase(
            files.issueImage[0],
            "issue-image"
          );
          console.log("Photo uploaded to:", issueImageUrl);
          maintenanceData.issueImage = issueImageUrl;
        }
      }

      const maintenanceRecords = await Maintenance.create(maintenanceData);

      return maintenanceRecords;
    } catch (error) {
      throw new ApiError(400, "Failed to create maintenance records", error);
    }
  }

  /**
   * Assign staff to a maintenance request and return updated record with staff name.
   * @param {string} maintenanceId - ID of the maintenance record
   * @param {string} staffId - ID of the staff to assign
   * @returns {Promise<object>} - Updated maintenance record with staff details
   * @throws {ApiError} - If inputs are invalid or update fails
   */

  async assignStaffToMaintenance(maintenanceId, staffId, timeNeeded) {
    // Checking validations
    this.#validateIds(maintenanceId, "Maintenance ID");
    this.#validateIds(staffId, "Staff ID");

    // update records
    const record = await Maintenance.findById(maintenanceId);

    if (!record) {
      throw new ApiError(400, "Maintenance Record not found");
    }

    if (record.status === "Resolved") {
      throw new ApiError(
        400,
        "Cannot assign staff to a resolved maintenance record."
      );
    }

    if (record.assignedStaffId) {
      throw new ApiError(
        400,
        "Staff has already been assigned to this maintenance record."
      );
    }

    if (record) {
      record.assignedStaffId = staffId;
      record.acceptedAt = new Date();
      record.status = "Ongoing";
      record.timeNeeded = timeNeeded;
    }

    await record.save();

    // aggregation pipeline
    const [recordWithStaffDetails] = await Maintenance.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId(maintenanceId) } },
      {
        $lookup: {
          from: "staffs", // Must match actual collection name in MongoDB
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
          staffName: "$staffInfo.name", // Add just the name from staff
        },
      },
      {
        $project: {
          staffInfo: 0, // Optional: remove staffInfo array from response
        },
      },
    ]);

    return recordWithStaffDetails;
  }

  /**
   * Mark an ongoing maintenance record as resolved
   * @param {string} maintenanceId - ID of the maintenance record
   * @returns {Promise<object>} - Updated maintenance record with staff details
   * @throws {ApiError} - If inputs are invalid or update fails
   */
  async markAsResolved(maintenanceId, remarks = null) {
    // Check validations
    this.#validateIds(maintenanceId, "Maintenance ID");

    // Update records as resolved
    const record = await Maintenance.findById(maintenanceId);

    if (!record) {
      throw new ApiError(400, "Maintenance record not found");
    }

    if (record.status === "Resolved") {
      throw new ApiError(400, "This Maintenance record is already resolved");
    }

    if (record.status !== "Ongoing") {
      throw new ApiError(
        400,
        `Cannot resolve a maintenance record with status "${record.status}". Only "Ongoing" records can be resolved.`
      );
    }

    record.status = "Resolved";
    record.resolvedAt = new Date();
    record.remarks = remarks ?? null; // if undefined, set to null
    await record.save();

    // aggregation pipeline
    const [resolvedRecordWithStaffdetails] = await Maintenance.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId(maintenanceId) } },
      {
        $lookup: {
          from: "staffs", // Must match actual collection name in MongoDB
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
          staffName: "$staffInfo.name", // Add just the name from staff
        },
      },
      {
        $project: {
          staffInfo: 0, // Optional: remove staffInfo array from response
        },
      },
    ]);

    return resolvedRecordWithStaffdetails;
  }

  // ------ Private Menthos ------ //

  // Helper function to validate required fields
  #validateRequiredFields(data) {
    const requiredFields = [
      "reportedBy",
      "userName",
      "issue",
      "description",
      "propertyId",
    ];

    const missingFields = requiredFields.filter((field) => !data[field]);

    if (missingFields.length > 0) {
      throw new ApiError(
        400,
        `Missing required fields: ${missingFields.join(", ")}`,
        missingFields.map((field) => ({
          field,
          message: `${field} is required`,
        }))
      );
    }
  }

  // Helper function to validate Ids
  #validateIds(id, fieldName) {
    if (!id) {
      throw new ApiError(400, `${fieldName} is required`);
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ApiError(400, `Invalid ${fieldName} format`);
    }
  }
}

export const maintenanceService = new MaintenanceService();
