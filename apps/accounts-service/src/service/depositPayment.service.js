import mongoose from "mongoose";
import { sendRPCRequest } from "../../../../libs/common/rabbitMq.js";
import {
  createRazorpayOrderId,
  verifyPayment as verifyRazorpaySignature,
} from "../../../../libs/common/razorpay.js";
import { USER_PATTERN } from "../../../../libs/patterns/user/user.pattern.js";
import Deposits from "../models/depositPayments.model.js";
import { createAccountLog } from "./accountsLog.service.js";

const processAndRecordDepositPayment = async ({
  userId,
  amount,
  paymentMethod,
  paymentDate,
  transactionId = null,
  collectedBy = "",
  razorpayDetails = {},
  remarks = "",
}) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const userResponse = await sendRPCRequest(
      USER_PATTERN.USER.GET_USER_BY_ID,
      { userId }
    );
    if (!userResponse.body.success) {
      throw new Error(userResponse.message || "User not found.");
    }
    const user = userResponse.body.data;

    const { stayDetails } = user;
    const { depositAmountPaid, nonRefundableDeposit, refundableDeposit } =
      stayDetails;

    const totalDepositAmount =
      (nonRefundableDeposit || 0) + (refundableDeposit || 0);
    const depositAmount = totalDepositAmount;

    if (depositAmount <= 0) throw new Error("Deposit amount is not set.");

    const pendingDeposit = totalDepositAmount - depositAmountPaid ?? 0;
    const dueAmount = pendingDeposit - amount ?? 0;

    if (pendingDeposit > 0 && amount > pendingDeposit) {
      throw new Error(
        `Please check the amount entered. It cannot be more than the pending deposit amount of ₹${pendingDeposit}.`
      );
    }

    if (
      paymentMethod === "Razorpay" &&
      pendingDeposit > 0 &&
      amount < pendingDeposit
    ) {
      throw new Error(
        `Your payment of ₹${amount} is less than the pending deposit of ₹${pendingDeposit}. Please pay the full pending deposit of ₹${pendingDeposit} when using Razorpay.`
      );
    }

    user.stayDetails.depositAmountPaid =
      (user.stayDetails.depositAmountPaid || 0) + amount;

    let status;
    if (totalDepositAmount === user.stayDetails.depositAmountPaid) {
      user.stayDetails.depositStatus = "paid";
      status = "Paid";
    }

    // Create the Payment Record
    const newDeposit = new Deposits({
      name: user.name,
      userType: user.userType,
      nonRefundableDeposit: user.stayDetails?.nonRefundableDeposit || 0,
      refundableDeposit: user.stayDetails?.refundableDeposit || 0,
      amountPaid: amount,
      dueAmount,
      paymentMethod,
      paymentDate,
      collectedBy,
      transactionId,
      status,
      property: user.stayDetails?.propertyId,
      userId: user._id,
      remarks,
      ...razorpayDetails,
    });

    await newDeposit.save({ session });

    await createAccountLog({
      logType: "Deposit",
      action: "Payment",
      description: `Deposit of ₹${amount} received from ${user.name}.`,
      amount: amount,
      propertyId: user.stayDetails?.propertyId,
      performedBy: collectedBy || "System",
      referenceId: newDeposit._id,
    });

    // Update user via RPC
    const updateUserResponse = await sendRPCRequest(
      USER_PATTERN.USER.UPDATE_USER,
      {
        userId,
        userData: {
          stayDetails: user.stayDetails,
        },
      }
    );

    if (!updateUserResponse.body.success) {
      throw new Error("Failed to update user financial details.");
    }

    await session.commitTransaction();
    return {
      success: true,
      status: 201,
      message: "Deposit recorded successfully.",
      data: newDeposit,
    };
  } catch (error) {
    await session.abortTransaction();
    console.error("Error during deposit processing:", error);
    return { success: false, status: 400, message: error.message };
  } finally {
    session.endSession();
  }
};

export const processAndRecordRefundPayment = async ({
  userId,
  amount,
  paymentMethod,
  paymentDate,
  transactionId = null,
  handledBy = "",
  razorpayDetails = {},
  remarks = "",
}) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const userResponse = await sendRPCRequest(
      USER_PATTERN.USER.GET_USER_BY_ID,
      { userId }
    );
    if (!userResponse.body.success) {
      throw new Error(userResponse.message || "User not found.");
    }
    const user = userResponse.body.data;

    const { stayDetails } = user;
    const { refundableDeposit } = stayDetails;

    const amountNumber = Number(amount);
    const refundableNumber = Number(refundableDeposit);

    if (amountNumber !== refundableNumber) {
      throw new Error(
        `Refund amount must exactly match the refundable deposit (${refundableNumber}).`
      );
    }

    user.stayDetails.depositStatus = "refunded";
    const status = "Refunded";

    // Create the Payment Record
    const newDeposit = new Deposits({
      name: user.name,
      userType: user.userType,
      nonRefundableDeposit: user.stayDetails?.nonRefundableDeposit || 0,
      refundableDeposit: user.stayDetails?.refundableDeposit || 0,
      amountPaid: amount,
      paymentMethod,
      paymentDate,
      handledBy,
      transactionId,
      status,
      property: user.stayDetails?.propertyId,
      userId: user._id,
      remarks,
      isRefund: true,
      ...razorpayDetails,
    });

    await newDeposit.save({ session });

    await createAccountLog({
      logType: "Deposit",
      action: "Refund",
      description: `Deposit of ₹${amount} refunded to ${user.name}.`,
      amount: -amount, // Negative as it's an outflow
      propertyId: user.stayDetails?.propertyId,
      performedBy: handledBy || "System",
      referenceId: newDeposit._id,
    });

    // Update user via RPC
    const updateUserResponse = await sendRPCRequest(
      USER_PATTERN.USER.UPDATE_USER,
      {
        userId,
        userData: {
          stayDetails: user.stayDetails,
        },
      }
    );

    if (!updateUserResponse.body.success) {
      throw new Error("Failed to update user financial details.");
    }

    await session.commitTransaction();
    return {
      success: true,
      status: 201,
      message: "Refund recorded successfully.",
      data: newDeposit,
    };
  } catch (error) {
    await session.abortTransaction();
    console.error("Error during refund processing:", error);
    return { success: false, status: 400, message: error.message };
  } finally {
    session.endSession();
  }
};

export const initiateOnlineDepositPayment = async (data) => {
  try {
    const { userId, amount } = data;
    const paymentAmount = Number(amount);

    if (!userId || !paymentAmount || paymentAmount <= 0) {
      return {
        success: false,
        status: 400,
        message: "Valid User ID and amount are required.",
      };
    }

    const userResponse = await sendRPCRequest(
      USER_PATTERN.USER.GET_USER_BY_ID,
      { userId }
    );
    if (!userResponse.body.success) {
      return { success: false, status: 404, message: "User not found." };
    }
    const user = userResponse.body.data;

    // ✅ NEW: Validate payment amount before creating Razorpay order
    const { stayDetails } = user;
    const { depositAmountPaid, nonRefundableDeposit, refundableDeposit } =
      stayDetails;
    let totalDepositAmount = nonRefundableDeposit + refundableDeposit;
    let pendingDeposit = totalDepositAmount - depositAmountPaid;

    const currentPendingDeposit = pendingDeposit || 0;

    if (currentPendingDeposit > 0 && paymentAmount < currentPendingDeposit) {
      return {
        success: false,
        status: 400,
        message: `Your payment of ₹${paymentAmount} is less than the pending deposit of ₹${currentPendingDeposit}. Please pay at least ₹${currentPendingDeposit} to proceed with the deposit.`,
      };
    }

    const razorpayResponse = await createRazorpayOrderId(paymentAmount);
    if (!razorpayResponse.success) {
      return {
        success: false,
        status: 500,
        message: "Failed to create payment order.",
      };
    }

    return {
      success: true,
      status: 200,
      message: "Order created successfully.",
      data: {
        orderId: razorpayResponse.orderId,
        amount: paymentAmount,
        name: "Heavens Living",
        prefill: { name: user.name, email: user.email, contact: user.contact },
      },
    };
  } catch (error) {
    console.error("Error during payment initiation:", error);
    return { success: false, status: 500, message: "Internal Server Error" };
  }
};

export const verifyAndRecordOnlineDepositPayment = async (data) => {
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    userId,
    amount,
  } = data;

  const isVerified = await verifyRazorpaySignature({
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
  });
  if (!isVerified) {
    return {
      success: false,
      status: 400,
      message: "Payment verification failed. Invalid signature.",
    };
  }

  return await processAndRecordDepositPayment({
    userId,
    amount: Number(amount),
    paymentMethod: "Razorpay",
    razorpayDetails: {
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      razorpaySignature: razorpay_signature,
    },
    transactionId: razorpay_payment_id,
  });
};

export const recordManualDepositPayment = async (data) => {
  const {
    userId,
    amount,
    paymentMethod,
    paymentDate,
    collectedBy,
    transactionId,
    remarks,
  } = data;
  if (!["Cash", "UPI", "Bank Transfer", "Card"].includes(paymentMethod)) {
    return {
      success: false,
      status: 400,
      message: "Invalid manual payment method.",
    };
  }

  if (paymentMethod !== "Cash" && paymentMethod !== "Card" && !transactionId) {
    return {
      success: false,
      status: 400,
      message: "Transaction ID is required for UPI/Bank Transfer.",
    };
  }

  return await processAndRecordDepositPayment({
    userId,
    amount: Number(amount),
    paymentMethod,
    paymentDate,
    collectedBy,
    transactionId,
    remarks,
  });
};

export const getAllDepositPayments = async (data) => {
  try {
    const {
      propertyId,
      isRefund,
      page,
      limit,
      userType,
      paymentMethod,
      paymentMonth,
      paymentYear,
      search,
    } = data;
    console.log(data);
    // Create separate filters for main query and aggregation
    const mainQueryFilter = {};
    const aggregationFilter = {};

    // Filter by property - handle separately for main query vs aggregation
    if (propertyId && propertyId !== "all" && propertyId !== "undefined") {
      // For main query - use string (Mongoose handles conversion)
      mainQueryFilter["property"] = propertyId;

      // For aggregation - use ObjectId
      if (mongoose.Types.ObjectId.isValid(propertyId)) {
        aggregationFilter["property"] = new mongoose.Types.ObjectId(propertyId);
      } else {
        aggregationFilter["property"] = propertyId;
      }
    }

    // Filter by paymentMethod
    if (paymentMethod) {
      mainQueryFilter["paymentMethod"] = paymentMethod;
      aggregationFilter["paymentMethod"] = paymentMethod;
    }

    // Filter by userType
    if (userType) {
      mainQueryFilter["userType"] = userType;
      aggregationFilter["userType"] = userType;
    }

    // Filter by month & year
    if (paymentMonth && paymentYear) {
      const startDate = new Date(paymentYear, paymentMonth - 1, 1);
      const endDate = new Date(paymentYear, paymentMonth, 1);
      mainQueryFilter["paymentDate"] = { $gte: startDate, $lt: endDate };
      aggregationFilter["paymentDate"] = { $gte: startDate, $lt: endDate };
    }

    // Search filter
    if (search) {
      const regex = new RegExp(search, "i");
      mainQueryFilter["$or"] = [{ name: regex }, { transactionId: regex }];
      aggregationFilter["$or"] = [{ name: regex }, { transactionId: regex }];
    }

    // Handle isRefund filter for main query only
    if (typeof isRefund !== "undefined") {
      const refundFlag = isRefund === true || isRefund === "true";
      mainQueryFilter["isRefund"] = refundFlag;
    }

    // Pagination
    const skip = (page - 1) * limit;

    // Projection fields
    let projection = "";
    if (typeof isRefund !== "undefined") {
      const refundFlag = isRefund === true || isRefund === "true";
      if (refundFlag) {
        projection =
          "name userType nonRefundableDeposit refundableDeposit amountPaid paymentMethod paymentDate transactionId handledBy remarks property";
      } else {
        projection =
          "name userType nonRefundableDeposit refundableDeposit amountPaid paymentMethod transactionId collectedBy paymentDate remarks property";
      }
    } else {
      projection =
        "name userType nonRefundableDeposit refundableDeposit amountPaid paymentMethod transactionId collectedBy paymentDate remarks property";
    }

    // Fetch paginated deposits
    const deposits = await Deposits.find(mainQueryFilter, projection)
      .sort({ paymentDate: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const totalDocuments = await Deposits.countDocuments(mainQueryFilter);

    // Create aggregation filters for received and refunded
    // ✅ Base property-only filter (always allowed)
    const propertyOnlyFilter = {};
    if (propertyId && mongoose.Types.ObjectId.isValid(propertyId)) {
      propertyOnlyFilter["property"] = new mongoose.Types.ObjectId(propertyId);
    } else if (
      propertyId &&
      propertyId !== "all" &&
      propertyId !== "undefined"
    ) {
      propertyOnlyFilter["property"] = propertyId;
    }

    // ✅ Build received & refunded filters dynamically
    let receivedMatch = {};
    let refundedMatch = {};
    console.log(aggregationFilter);
    if (typeof isRefund !== "undefined") {
      const refundFlag = isRefund === true || isRefund === "true";
      if (refundFlag) {
        refundedMatch = { ...aggregationFilter, isRefund: true };
        receivedMatch = { ...propertyOnlyFilter, isRefund: false };
      } else {
        refundedMatch = { ...propertyOnlyFilter, isRefund: true };
        receivedMatch = { ...aggregationFilter, isRefund: false };
      }
    } else {
      refundedMatch = { ...aggregationFilter, isRefund: true };
      receivedMatch = { ...aggregationFilter, isRefund: false };
    }

    const [receivedAggregation, refundedAggregation] = await Promise.all([
      // Total received (non-refunded)
      Deposits.aggregate([
        { $match: receivedMatch },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: "$amountPaid" },
          },
        },
      ]),
      // Total refunded
      Deposits.aggregate([
        { $match: refundedMatch },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: "$amountPaid" },
          },
        },
      ]),
    ]);

    const totalReceivedAmount = receivedAggregation[0]?.totalAmount || 0;
    const totalRefundedAmount = refundedAggregation[0]?.totalAmount || 0;
    return {
      success: true,
      status: 200,
      totalReceivedAmount,
      totalRefundedAmount,
      data: deposits,
      pagination: {
        total: totalDocuments,
        page,
        limit,
        pages: Math.ceil(totalDocuments / limit),
      },
    };
  } catch (error) {
    console.error("Get All Deposit Payments Service Error:", error);
    return {
      success: false,
      status: 500,
      message: "Internal Server Error",
      error: error.message,
    };
  }
};

export const getLatestDepositPaymentsByUsers = async ({ userIds }) => {
  try {
    const deposits = await Deposits.aggregate([
      {
        $match: {
          userId: { $in: userIds.map((id) => new mongoose.Types.ObjectId(id)) },
        },
      },
      { $sort: { createdAt: -1 } }, // ensure latest first
      {
        $group: {
          _id: "$userId",
          paymentDate: { $first: "$paymentDate" },
          amountPaid: { $first: "$amountPaid" }, // take from latest doc
          dueAmount: { $first: "$dueAmount" },
        },
      },
      {
        $project: {
          userId: "$_id",
          paymentDate: 1,
          amountPaid: 1,
          dueAmount: 1,
          _id: 0,
        },
      },
    ]);

    return { success: true, status: 200, data: deposits };
  } catch (err) {
    return { success: false, status: 500, message: err.message };
  }
};
