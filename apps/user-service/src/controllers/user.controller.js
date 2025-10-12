import {
  adminUpdateUser,
  approveUser,
  createStatusRequest,
  extendUserDays,
  getCheckOutedUsersByRentType,
  getHeavensUserById,
  getPendingStatusRequests,
  getTodayCheckouts,
  fetchUserData,
  getUnapprovedUsers,
  getUserByEmail,
  getUserIds,
  getUsersByRentType,
  getUsersForNotification,
  getUserStatusRequests,
  handleBlockStatus,
  registerUser,
  rejectUser,
  rejoinUser,
  respondToStatusRequest,
  updateProfileCompletion,
  vacateUser,
  verifyEmail,
  setResetToken,
  getUserByResetToken,
  updateUser,
  getAllPaymentPendingUsers,
  getResidentCounts,
  getUsersWithBirthdayToday,
  getUserStatisticsForAccountDashboard,
  getUserDepositStatisticsForAccountDashboard,
  getUsersByAgencyService,
  getPendingDepositPayments,
  allocateUsersToAgent,
  allocateCommissionToUsers,
} from "../services/user.service.js";
import { createResponder } from "../../../../libs/common/rabbitMq.js";
import { USER_PATTERN } from "../../../../libs/patterns/user/user.pattern.js";

createResponder(USER_PATTERN.USER.FETCH_USER_DATA, async (data) => {
  return await fetchUserData(data);
});

createResponder(USER_PATTERN.USER.GET_USER_BY_EMAIL, async (data) => {
  return await getUserByEmail(data?.email);
});

createResponder(USER_PATTERN.USER.REGISTER_USER, async (data) => {
  return await registerUser(data);
});

createResponder(USER_PATTERN.USER.UNAPPROVED_USER, async (data) => {
  return await getUnapprovedUsers(data);
});

createResponder(USER_PATTERN.USER.APPROVE_USER, async (data) => {
  return await approveUser(data);
});

createResponder(USER_PATTERN.USER.REJECT_USER, async (data) => {
  return await rejectUser(data);
});

createResponder(USER_PATTERN.USER.VERIFY_EMAIL, async (data) => {
  return await verifyEmail(data);
});

createResponder(USER_PATTERN.USER.UPDATE_PROFILE, async (data) => {
  return await updateProfileCompletion(data);
});

createResponder(USER_PATTERN.USER.ADMIN_UPDATE_PROFILE, async (data) => {
  return await adminUpdateUser(data);
});

createResponder(USER_PATTERN.USER.GET_USER_BY_ID, async (data) => {
  return await getHeavensUserById(data);
});

createResponder(USER_PATTERN.USER.GET_USERS_BY_RENT_TYPE, async (data) => {
  return await getUsersByRentType(data);
});

createResponder(
  USER_PATTERN.USER.GET_CHECKOUTED_USERS_BY_RENT_TYPE,
  async (data) => {
    return await getCheckOutedUsersByRentType(data);
  }
);

createResponder(USER_PATTERN.USER.VACATE_USER, async (data) => {
  return await vacateUser(data);
});

createResponder(USER_PATTERN.USER.REJOIN_USER, async (data) => {
  return await rejoinUser(data);
});

createResponder(USER_PATTERN.USER.GET_USER_IDS, async (data) => {
  return await getUserIds(data);
});

createResponder(USER_PATTERN.USER.GET_USERS_FOR_NOTIFICATION, async (data) => {
  return await getUsersForNotification(data);
});

createResponder(USER_PATTERN.USER.GET_TODAY_CHECKOUTS, async (data) => {
  return await getTodayCheckouts(data);
});

createResponder(USER_PATTERN.USER.EXTEND_USER_DAYS, async (data) => {
  return await extendUserDays(data);
});

createResponder(USER_PATTERN.USER.CREATE_STATUS_REQUEST, async (data) => {
  return await createStatusRequest(data);
});

createResponder(USER_PATTERN.USER.GET_PENDING_STATUS_REQUESTS, async (data) => {
  return await getPendingStatusRequests(data);
});

createResponder(USER_PATTERN.USER.RESPOND_TO_STATUS_REQUEST, async (data) => {
  return await respondToStatusRequest(data);
});

createResponder(USER_PATTERN.USER.GET_USER_STATUS_REQUESTS, async (data) => {
  return await getUserStatusRequests(data);
});

createResponder(USER_PATTERN.USER.HANDLE_BLOCK_STATUS, async (data) => {
  return await handleBlockStatus(data);
});

createResponder(USER_PATTERN.PASSWORD.SET_RESET_TOKEN, async (data) => {
  return await setResetToken(data);
});

createResponder(USER_PATTERN.PASSWORD.GET_USER_BY_RESET_TOKEN, async (data) => {
  return await getUserByResetToken(data);
});

createResponder(
  USER_PATTERN.PASSWORD.UPDATE_PASSWORD,
  async ({ userId, password }) => {
    return await updatePassword({ userId, password });
  }
);

createResponder(USER_PATTERN.USER.UPDATE_USER, async (data) => {
  return await updateUser(data);
});

createResponder(
  USER_PATTERN.PAYMENT.GET_ALL_PAYMENT_PENDING_USERS,
  async (data) => {
    return await getAllPaymentPendingUsers(data);
  }
);

createResponder(USER_PATTERN.DASHBOARD.GET_USERS_COUNTS, async (data) => {
  return await getResidentCounts(data);
});

createResponder(USER_PATTERN.USER.GET_USERS_WITH_BIRTHDAY_TODAY, async () => {
  return await getUsersWithBirthdayToday();
});

createResponder(
  USER_PATTERN.DASHBOARD.GET_USER_STATISTICS_FOR_ACCOUNTS_DASHBOARD,
  async (data) => {
    return await getUserStatisticsForAccountDashboard(data);
  }
);

createResponder(USER_PATTERN.USER.GET_USER_BY_AGENCY, async (data) => {
  return await getUsersByAgencyService(data);
});

createResponder(
  USER_PATTERN.PAYMENT.GET_ALL_DEPOSIT_PENDING_USERS,
  async (data) => {
    return await getPendingDepositPayments(data);
  }
);

createResponder(
  USER_PATTERN.DASHBOARD.GET_USER_DEPOSIT_STATISTICS_FOR_ACCOUNTS_DASHBOARD,
  async (data) => {
    return await getUserDepositStatisticsForAccountDashboard(data);
  }
);

createResponder(USER_PATTERN.USER.ALLOCATE_AGENT_TO_USERS, async (data) => {
  return await allocateUsersToAgent(data);
});

createResponder(
  USER_PATTERN.USER.ALLOCATE_COMMISSION_AMOUNT_TO_USERS,
  async (data) => {
    return await allocateCommissionToUsers(data);
  }
);
