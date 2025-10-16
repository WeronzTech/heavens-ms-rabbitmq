import { sendRPCRequest } from "../../../../../libs/common/rabbitMq.js";
import { USER_PATTERN } from "../../../../../libs/patterns/user/user.pattern.js";

export const registerUser = async (req, res) => {
  const {
    userType,
    name,
    email,
    contact,
    password,
    stayDetails,
    messDetails,
    referralLink,
    isHeavens,
    personalDetails,
  } = req.body;
  const response = await sendRPCRequest(USER_PATTERN.USER.REGISTER_USER, {
    userType,
    name,
    email,
    contact,
    password,
    stayDetails,
    messDetails,
    referralLink,
    isHeavens,
    personalDetails,
  });

  return res.status(response.statusCode).json(response.body);
};

export const getUnapprovedUsers = async (req, res) => {
  const { propertyId } = req.query;
  approveUser;
  const response = await sendRPCRequest(USER_PATTERN.USER.UNAPPROVED_USER, {
    propertyId,
  });

  return res.status(response.status).json(response.body);
};

export const approveUser = async (req, res) => {
  const { id } = req.params;
  const {
    name,
    email,
    contact,
    userType,
    rentType,
    propertyId,
    propertyName,
    roomId,
    refundableDeposit,
    nonRefundableDeposit,
    joinDate,
    messDetails,
    stayDetails,
    monthlyRent,
    kitchenId,
    kitchenName,
    updatedBy,
  } = req.body;
  const response = await sendRPCRequest(USER_PATTERN.USER.APPROVE_USER, {
    id,
    name,
    email,
    contact,
    userType,
    rentType,
    propertyId,
    propertyName,
    roomId,
    refundableDeposit,
    nonRefundableDeposit,
    joinDate,
    messDetails,
    stayDetails,
    monthlyRent,
    kitchenId,
    kitchenName,
    updatedBy,
  });

  return res.status(response.status).json(response.body);
};

export const rejectUser = async (req, res) => {
  const { id } = req.params;
  const { updatedBy } = req.query;

  const response = await sendRPCRequest(USER_PATTERN.USER.REJECT_USER, {
    id,
    updatedBy,
  });

  const status = response?.status ?? 200;
  const body = response?.body ?? response;

  return res.status(status).json(body);
};

export const verifyEmail = async (req, res) => {
  const { token, email } = req.query;

  const response = await sendRPCRequest(USER_PATTERN.USER.VERIFY_EMAIL, {
    token,
    email,
  });

  if (response.isHtml) {
    return res.status(response.status).send(response.body);
  }

  return res.status(response.status).json(response.body);
};

export const updateProfileCompletion = async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;
  const files = req.files;

  const response = await sendRPCRequest(USER_PATTERN.USER.UPDATE_PROFILE, {
    id,
    updateData,
    files,
  });
  return res.status(response.status).json(response.body);
};

export const adminUpdateUser = async (req, res) => {
  try {
    const { id } = req.params;

    const files = req.files;
    const flat = req.body;

    const response = await sendRPCRequest(
      USER_PATTERN.USER.ADMIN_UPDATE_PROFILE,
      {
        id,
        files,
        flat,
      }
    );

    return res
      .status(response?.status || 500)
      .json(
        response?.body || { success: false, error: "Invalid RPC response" }
      );
  } catch (error) {
    console.error("[API-GATEWAY] adminUpdateUserController error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to process admin user update request",
    });
  }
};

export const getHeavensUserById = async (req, res) => {
  try {
    const userId = req.params.id;

    const response = await sendRPCRequest(USER_PATTERN.USER.GET_USER_BY_ID, {
      userId,
    });

    return res
      .status(response?.status || 500)
      .json(
        response?.body || { success: false, message: "Invalid RPC response" }
      );
  } catch (error) {
    console.error("[API-GATEWAY] getHeavensUserById error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch user details",
    });
  }
};

export const getUsersByRentType = async (req, res) => {
  try {
    const { rentType, propertyId, all, page, limit, search, status, joinDate } =
      req.query;

    const response = await sendRPCRequest(
      USER_PATTERN.USER.GET_USERS_BY_RENT_TYPE,
      {
        rentType,
        propertyId,
        all,
        page,
        limit,
        search,
        status,
        joinDate,
      }
    );

    return res
      .status(response?.status || 500)
      .json(
        response?.body || { success: false, message: "Invalid RPC response" }
      );
  } catch (error) {
    console.error("[API-GATEWAY] getUsersByRentTypeHandler error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch users by rent type",
    });
  }
};

export const getCheckOutedUsersByRentType = async (req, res) => {
  try {
    const { rentType, propertyId, page = 1, limit = 10 } = req.query;

    const response = await sendRPCRequest(
      USER_PATTERN.USER.GET_CHECKOUTED_USERS_BY_RENT_TYPE,
      {
        rentType,
        propertyId,
        page,
        limit,
      }
    );

    return res
      .status(response?.status || 500)
      .json(
        response?.body || { success: false, message: "Invalid RPC response" }
      );
  } catch (error) {
    console.error(
      "[API-GATEWAY] getCheckOutedUsersByRentTypeHandler error:",
      error
    );
    return res.status(500).json({
      success: false,
      message: "Failed to fetch checkout users by rent type",
    });
  }
};

export const vacateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { adminName } = req.body;

    const response = await sendRPCRequest(USER_PATTERN.USER.VACATE_USER, {
      id,
      adminName,
    });

    return res
      .status(response?.status || 500)
      .json(
        response?.body || { success: false, message: "Invalid RPC response" }
      );
  } catch (error) {
    console.error("[API-GATEWAY] vacateUserHandler error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to vacate user",
    });
  }
};

export const rejoinUser = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      userType,
      rentType,
      propertyId,
      propertyName,

      // For MessOnly
      kitchenId,
      kitchenName,

      roomId,

      // Financial fields
      rent,
      nonRefundableDeposit,
      refundableDeposit,

      // Type-specific dates
      joinDate,
      messDetails,
      noOfDays,
      updatedBy,
    } = req.body;
    const response = await sendRPCRequest(USER_PATTERN.USER.REJOIN_USER, {
      id,
      userType,
      rentType,
      propertyId,
      propertyName,
      kitchenId,
      kitchenName,
      roomId,
      rent,
      nonRefundableDeposit,
      refundableDeposit,
      joinDate,
      messDetails,
      noOfDays,
      updatedBy,
    });

    return res
      .status(response?.status || 500)
      .json(
        response?.body || { success: false, message: "Invalid RPC response" }
      );
  } catch (error) {
    console.error("[API-GATEWAY] rejoinUserHandler error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to rejoin user",
    });
  }
};

export const getUserIds = async (req, res) => {
  try {
    const { messOnly, studentOnly, dailyRentOnly, workerOnly } = req.query;
    const response = await sendRPCRequest(USER_PATTERN.USER.GET_USER_IDS, {
      messOnly,
      studentOnly,
      dailyRentOnly,
      workerOnly,
    });

    return res
      .status(response?.status || 500)
      .json(
        response?.body || { success: false, message: "Invalid RPC response" }
      );
  } catch (error) {
    console.error("[API-GATEWAY] getUserIdsHandler error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch user IDs",
    });
  }
};

export const getUsersForNotification = async (req, res) => {
  try {
    const { propertyId } = req.params;
    const response = await sendRPCRequest(
      USER_PATTERN.USER.GET_USERS_FOR_NOTIFICATION,
      { propertyId }
    );

    return res
      .status(response?.status || 500)
      .json(
        response?.body || { success: false, message: "Invalid RPC response" }
      );
  } catch (error) {
    console.error(
      "[API-GATEWAY] getResidentsForNotificationHandler error:",
      error
    );
    return res.status(500).json({
      success: false,
      message: "Failed to fetch residents for notification",
    });
  }
};

export const getTodayCheckouts = async (req, res) => {
  try {
    const { type, propertyId } = req.query;
    const response = await sendRPCRequest(
      USER_PATTERN.USER.GET_TODAY_CHECKOUTS,
      { type, propertyId }
    );

    return res
      .status(response?.status || 500)
      .json(
        response?.body || { success: false, message: "Invalid RPC response" }
      );
  } catch (error) {
    console.error("[API-GATEWAY] getTodayCheckoutsHandler error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch today's checkouts",
    });
  }
};

export const extendUserDays = async (req, res) => {
  try {
    const { id } = req.params;
    const { extendDate, additionalDays, newRentAmount, adminName } = req.body;
    const response = await sendRPCRequest(USER_PATTERN.USER.EXTEND_USER_DAYS, {
      id,
      extendDate,
      additionalDays,
      newRentAmount,
      adminName,
    });

    return res
      .status(response?.status || 500)
      .json(
        response?.body || { success: false, message: "Invalid RPC response" }
      );
  } catch (error) {
    console.error("[API-GATEWAY] extendUserDaysHandler error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to extend user stay",
    });
  }
};

export const createStatusRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { type, reason, isInstantCheckout } = req.body;
    const response = await sendRPCRequest(
      USER_PATTERN.USER.CREATE_STATUS_REQUEST,
      { id, type, reason, isInstantCheckout }
    );

    return res
      .status(response?.status || 500)
      .json(response?.body || { error: "Invalid RPC response" });
  } catch (error) {
    console.error("[API-GATEWAY] createStatusRequestHandler error:", error);
    return res.status(500).json({ error: "Failed to submit status request" });
  }
};

export const getPendingStatusRequests = async (req, res) => {
  try {
    const {
      propertyId,
      type,
      userType,
      sortBy = "requestedAt",
      sortOrder = "asc",
    } = req.query;
    const response = await sendRPCRequest(
      USER_PATTERN.USER.GET_PENDING_STATUS_REQUESTS,
      {
        propertyId,
        type,
        userType,
        sortBy,
        sortOrder,
      }
    );

    return res
      .status(response?.status || 500)
      .json(response?.body || { error: "Invalid RPC response" });
  } catch (error) {
    console.error(
      "[API-GATEWAY] getPendingStatusRequestsHandler error:",
      error
    );
    return res.status(500).json({ error: "Failed to fetch pending requests" });
  }
};
export const respondToStatusRequest = async (req, res) => {
  try {
    const { id, requestId } = req.params;
    const { status, comment, adminName } = req.body;
    const response = await sendRPCRequest(
      USER_PATTERN.USER.RESPOND_TO_STATUS_REQUEST,
      { id, requestId, status, comment, adminName }
    );

    return res
      .status(response?.status || 500)
      .json(response?.body || { error: "Invalid RPC response" });
  } catch (error) {
    console.error("[API-GATEWAY] respondToStatusRequestHandler error:", error);
    return res.status(500).json({ error: "Failed to process request" });
  }
};

export const getUserStatusRequests = async (req, res) => {
  try {
    const { id } = req.params;
    const { type, status } = req.query;
    const response = await sendRPCRequest(
      USER_PATTERN.USER.GET_USER_STATUS_REQUESTS,
      { id, type, status }
    );

    return res
      .status(response?.status || 500)
      .json(response?.body || { error: "Invalid RPC response" });
  } catch (error) {
    console.error("[API-GATEWAY] getUserStatusRequestsHandler error:", error);
    return res.status(500).json({ error: "Failed to fetch status requests" });
  }
};

export const handleBlockStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, extendDate, adminName } = req.body;
    const response = await sendRPCRequest(
      USER_PATTERN.USER.HANDLE_BLOCK_STATUS,
      { id, action, extendDate, adminName }
    );

    return res
      .status(response?.status || 500)
      .json(response?.body || { error: "Invalid RPC response" });
  } catch (error) {
    console.error("[API-GATEWAY] handleBlockStatusHandler error:", error);
    return res.status(500).json({ error: "Failed to update block status" });
  }
};

export const getAllPendingPayments = async (req, res) => {
  try {
    const {
      propertyId,
      rentType,
      userType,
      search,
      page = 1,
      limit = 10,
    } = req.query;

    const response = await sendRPCRequest(
      USER_PATTERN.PAYMENT.GET_ALL_PAYMENT_PENDING_USERS,
      { propertyId, rentType, userType, search, page, limit }
    );

    return res.status(response?.status || 500).json(response);
  } catch (error) {
    console.error("RPC Get All Fee Payments Controller Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

export const getUsersByAgencyController = async (req, res) => {
  try {
    const { agent } = req.query;

    const response = await sendRPCRequest(
      USER_PATTERN.USER.GET_USER_BY_AGENCY,
      { agent }
    );

    return res.status(response.status).json(response);
  } catch (error) {
    console.error("Error in getUsersByAgencyController:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch users by agency",
    });
  }
};

export const getAllPendingDeposits = async (req, res) => {
  try {
    const { propertyId, search, userType, page = 1, limit = 10 } = req.query;

    const response = await sendRPCRequest(
      USER_PATTERN.PAYMENT.GET_ALL_DEPOSIT_PENDING_USERS,
      { propertyId, search, userType, page, limit }
    );

    return res.status(response?.status || 500).json(response);
  } catch (error) {
    console.error("RPC Get All Deposit Payments Controller Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

const handleRPCAndRespond = async (res, pattern, data) => {
  try {
    const response = await sendRPCRequest(pattern, data);
    return res.status(response.status || 500).json(response);
  } catch (error) {
    console.error(`API Gateway Error in ${pattern}:`, error);
    return res
      .status(500)
      .json({ message: "Internal Server Error in API Gateway." });
  }
};

export const getUsersWithBirthdayToday = (req, res) =>
  handleRPCAndRespond(res, USER_PATTERN.USER.GET_USERS_WITH_BIRTHDAY_TODAY, {});

export const allocateUsersToAgent = async (req, res) => {
  try {
    const { agentId, userIds } = req.body;

    if (!agentId || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Agent ID and at least one user ID are required.",
      });
    }

    const response = await sendRPCRequest(
      USER_PATTERN.USER.ALLOCATE_AGENT_TO_USERS,
      { agentId, userIds }
    );

    return res.status(response?.status || 500).json(response);
  } catch (error) {
    console.error("RPC allocation Controller Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};
