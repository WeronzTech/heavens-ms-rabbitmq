import Commission from "../models/commission.model.js";
import mongoose from "mongoose";
import { sendRPCRequest } from "../../../../libs/common/rabbitMq.js";
import { CLIENT_PATTERN } from "../../../../libs/patterns/client/client.pattern.js";
import { PROPERTY_PATTERN } from "../../../../libs/patterns/property/property.pattern.js";
import { USER_PATTERN } from "../../../../libs/patterns/user/user.pattern.js";

export const addCommission = async (data) => {
  try {
    const { agent, agency,agencyName, property, amount, userIds, paymentType,remarks } = data;
    if (
      !agent ||
      !agent.name ||
      !agency ||
      !agencyName ||
      !property ||
      !amount ||
      !paymentType
    ) {
      return {
        success: false,
        status: 400,
        message: "Missing required fields.",
      };
    }

    if (userIds && userIds.length > 0) {
      const existingCommission = await Commission.findOne({
        userIds: { $in: userIds },
      });
      if (existingCommission) {
        return {
          success: false,
          status: 409, // Conflict
          message:
            "A commission already exists for one of the provided students.",
        };
      }
    }

    const newCommission = await Commission.create(data);
    return {
      success: true,
      status: 201,
      message: "Commission created successfully.",
      data: newCommission,
    };
  } catch (error) {
    console.error("Add Commission Service Error:", error);
    return {
      success: false,
      status: 500,
      message: "Internal Server Error",
      error: error.message,
    };
  }
};

export const getAllCommissions = async (filters) => {
  try {
    const { agencyId, propertyId, startDate, endDate } = filters;
    const query = {};

    if (agencyId) query.agency = agencyId;
    if (propertyId) query.property = propertyId;
    if (startDate && endDate) {
      query.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }

    const commissions = await Commission.find(query)
      .sort({ createdAt: -1 })
      .lean();

    // Enrich commissions with data from other services
    const enrichedCommissions = await Promise.all(
      commissions.map(async (commission) => {
        const agencyResponse = await sendRPCRequest(
          CLIENT_PATTERN.AGENCY.GET_AGENCY_BY_ID,
          { agencyId: commission.agency }
        );
        const propertyResponse = await sendRPCRequest(
          PROPERTY_PATTERN.PROPERTY.GET_PROPERTY_BY_ID,
          { id: commission.property }
        );

        // Enrich userIds
        let enrichedUsers = [];
        if (commission.userIds && commission.userIds.length > 0) {
          enrichedUsers = await Promise.all(
            commission.userIds.map(async (userId) => {
              const userResponse = await sendRPCRequest(
                USER_PATTERN.USER.GET_USER_BY_ID,
                { userId }
              );
              if (userResponse.body.success) {
                return {
                  _id: userResponse.body.data._id,
                  name: userResponse.body.data.name,
                };
              }
              return { _id: userId, name: "User not found" };
            })
          );
        }

        return {
          ...commission,
          userIds: enrichedUsers,
          agency: agencyResponse.success
            ? {
                _id: agencyResponse.data._id,
                agencyName: agencyResponse.data.agencyName,
              }
            : { _id: commission.agency, agencyName: "N/A" },
          property: propertyResponse.success
            ? {
                _id: propertyResponse.data._id,
                propertyName: propertyResponse.data.propertyName,
              }
            : { _id: commission.property, propertyName: "N/A" },
        };
      })
    );

    return {
      success: true,
      status: 200,
      message: "Commissions retrieved successfully.",
      data: enrichedCommissions,
    };
  } catch (error) {
    console.error("Get All Commissions Service Error:", error);
    return {
      success: false,
      status: 500,
      message: "Internal Server Error",
      error: error.message,
    };
  }
};

export const getCommissionById = async (data) => {
  try {
    const { commissionId } = data;
    const commission = await Commission.findById(commissionId).lean();
    if (!commission) {
      return { success: false, status: 404, message: "Commission not found." };
    }

    // Enrich commission data
    const agencyResponse = await sendRPCRequest(
      CLIENT_PATTERN.AGENCY.GET_AGENCY_BY_ID,
      { agencyId: commission.agency }
    );
    const propertyResponse = await sendRPCRequest(
      PROPERTY_PATTERN.PROPERTY.GET_PROPERTY_BY_ID,
      { id: commission.property }
    );

    // Enrich userIds
    let enrichedUsers = [];
    if (commission.userIds && commission.userIds.length > 0) {
      enrichedUsers = await Promise.all(
        commission.userIds.map(async (userId) => {
          const userResponse = await sendRPCRequest(
            USER_PATTERN.USER.GET_USER_BY_ID,
            { userId }
          );
          if (userResponse.body.success) {
            return {
              _id: userResponse.body.data._id,
              name: userResponse.body.data.name,
            };
          }
          return { _id: userId, name: "User not found" };
        })
      );
    }

    const enrichedCommission = {
      ...commission,
      userIds: enrichedUsers,
      agency: agencyResponse.success
        ? {
            _id: agencyResponse.data._id,
            agencyName: agencyResponse.data.agencyName,
          }
        : { _id: commission.agency, agencyName: "N/A" },
      property: propertyResponse.success
        ? {
            _id: propertyResponse.data._id,
            propertyName: propertyResponse.data.propertyName,
          }
        : { _id: commission.property, propertyName: "N/A" },
    };

    return {
      success: true,
      status: 200,
      message: "Commission retrieved successfully.",
      data: enrichedCommission,
    };
  } catch (error) {
    console.error("Get Commission By ID Service Error:", error);
    return {
      success: false,
      status: 500,
      message: "Internal Server Error",
      error: error.message,
    };
  }
};

export const editCommission = async (data) => {
  try {
    const { commissionId, ...updateData } = data;

    if (updateData.userIds && updateData.userIds.length > 0) {
      const existingCommission = await Commission.findOne({
        userIds: { $in: updateData.userIds },
        _id: { $ne: commissionId }, // Exclude the current document
      });
      if (existingCommission) {
        return {
          success: false,
          status: 409, // Conflict
          message:
            "A commission already exists for one of the provided students.",
        };
      }
    }

    const updatedCommission = await Commission.findByIdAndUpdate(
      commissionId,
      updateData,
      { new: true }
    );
    if (!updatedCommission) {
      return { success: false, status: 404, message: "Commission not found." };
    }
    return {
      success: true,
      status: 200,
      message: "Commission updated successfully.",
      data: updatedCommission,
    };
  } catch (error) {
    console.error("Edit Commission Service Error:", error);
    return {
      success: false,
      status: 500,
      message: "Internal Server Error",
      error: error.message,
    };
  }
};

export const deleteCommission = async (data) => {
  try {
    const { commissionId } = data;
    const deletedCommission = await Commission.findByIdAndDelete(commissionId);
    if (!deletedCommission) {
      return { success: false, status: 404, message: "Commission not found." };
    }
    return {
      success: true,
      status: 200,
      message: "Commission deleted successfully.",
    };
  } catch (error) {
    console.error("Delete Commission Service Error:", error);
    return {
      success: false,
      status: 500,
      message: "Internal Server Error",
      error: error.message,
    };
  }
};

export const checkUserCommission = async (data) => {
  try {
    const { userId } = data;
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return {
        success: false,
        status: 400,
        message: "Valid User ID is required.",
      };
    }

    const commission = await Commission.findOne({ userIds: userId });

    if (!commission) {
      return {
        success: true,
        status: 200,
        message: "No commission found for this user.",
        data: { hasCommission: false },
      };
    }

    return {
      success: true,
      status: 200,
      message: "Commission found for this user.",
      data: {
        hasCommission: true,
        commissionAmount: commission?.amount / commission?.userIds?.length,
        commission,
      },
    };
  } catch (error) {
    console.error("Check User Commission Service Error:", error);
    return {
      success: false,
      status: 500,
      message: "Internal Server Error",
      error: error.message,
    };
  }
};

export const getCommissionByProperty = async (data) => {
  try {
    let commissions;

    // If propertyId is provided → filter using correct field "property"
    if (data && data.property) {
      commissions = await Commission.find({ property: data.property });
    } else {
      commissions = await Commission.find({});
    }

    if (!commissions || commissions.length === 0) {
      return {
        success: false,
        status: 404,
        message: data?.property
          ? "No commissions found for this property."
          : "No commissions found.",
      };
    }

    return {
      success: true,
      status: 200,
      message: data?.property
        ? "Commissions fetched successfully for the property."
        : "All commissions fetched successfully.",
      data: commissions,
    };
  } catch (error) {
    console.error("Get Commission By Property Service Error:", error);
    return {
      success: false,
      status: 500,
      message: "Internal Server Error",
      error: error.message,
    };
  }
};

