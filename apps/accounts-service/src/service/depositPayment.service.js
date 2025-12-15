import mongoose from "mongoose";
import { sendRPCRequest } from "../../../../libs/common/rabbitMq.js";
import {
  createRazorpayOrderId,
  verifyPayment as verifyRazorpaySignature,
} from "../../../../libs/common/razorpay.js";
import { USER_PATTERN } from "../../../../libs/patterns/user/user.pattern.js";
import Deposits from "../models/depositPayments.model.js";
import { createAccountLog } from "./accountsLog.service.js";
import ReceiptCounter from "../models/receiptCounter.model.js";
import { createJournalEntry } from "./accounting.service.js";
import { ACCOUNT_SYSTEM_NAMES } from "../config/accountMapping.config.js";
import { PROPERTY_PATTERN } from "../../../../libs/patterns/property/property.pattern.js";
import moment from "moment";
import emailService from "../../../../libs/email/email.service.js";

const generateReceiptNumber = async (property, session) => {
  const monthYear = moment().format("YYYY-MM");
  const counter = await ReceiptCounter.findOneAndUpdate(
    { propertyId: property.propertyId, monthYear },
    { $inc: { sequence: 1 } },
    { new: true, upsert: true, session }
  );

  const seq = String(counter.sequence).padStart(4, "0");
  const propertyCode = property.propertyName
    ? property.propertyName.replace(/\s+/g, "").toUpperCase().slice(0, 3)
    : "PRP";

  // Example format: REC-GHS-202510-0007
  const receiptNumber = `HVNS-${propertyCode}-${moment().format(
    "YYYYMM"
  )}-${seq}`;

  return receiptNumber;
};

// const processAndRecordDepositPayment = async ({
//   userId,
//   amount,
//   paymentMethod,
//   paymentDate,
//   transactionId = null,
//   collectedBy = "",
//   razorpayDetails = {},
//   remarks = "",
// }) => {
//   const session = await mongoose.startSession();
//   session.startTransaction();

//   try {
//     const userResponse = await sendRPCRequest(
//       USER_PATTERN.USER.GET_USER_BY_ID,
//       { userId }
//     );
//     if (!userResponse.body.success) {
//       throw new Error(userResponse.message || "User not found.");
//     }
//     const user = userResponse.body.data;

//     const { stayDetails } = user;
//     const { depositAmountPaid, nonRefundableDeposit, refundableDeposit } =
//       stayDetails;

//     const totalDepositAmount =
//       (nonRefundableDeposit || 0) + (refundableDeposit || 0);
//     const depositAmount = totalDepositAmount;

//     if (depositAmount <= 0) throw new Error("Deposit amount is not set.");

//     const pendingDeposit = totalDepositAmount - depositAmountPaid ?? 0;
//     const dueAmount = pendingDeposit - amount ?? 0;

//     if (pendingDeposit > 0 && amount > pendingDeposit) {
//       throw new Error(
//         `Please check the amount entered. It cannot be more than the pending deposit amount of ₹${pendingDeposit}.`
//       );
//     }

//     // if (
//     //   paymentMethod === "Razorpay" &&
//     //   pendingDeposit > 0 &&
//     //   amount < pendingDeposit
//     // ) {
//     //   throw new Error(
//     //     `Your payment of ₹${amount} is less than the pending deposit of ₹${pendingDeposit}. Please pay the full pending deposit of ₹${pendingDeposit} when using Razorpay.`
//     //   );
//     // }

//     user.stayDetails.depositAmountPaid =
//       (user.stayDetails.depositAmountPaid || 0) + amount;

//     let status;
//     if (totalDepositAmount === user.stayDetails.depositAmountPaid) {
//       user.stayDetails.depositStatus = "paid";
//       status = "Paid";
//     }

//     const receiptNumber = await generateReceiptNumber(
//       user.stayDetails,
//       session
//     );

//     // Create the Payment Record
//     const newDeposit = new Deposits({
//       name: user.name,
//       userType: user.userType,
//       nonRefundableDeposit: user.stayDetails?.nonRefundableDeposit || 0,
//       refundableDeposit: user.stayDetails?.refundableDeposit || 0,
//       amountPaid: amount,
//       dueAmount,
//       paymentMethod,
//       paymentDate,
//       collectedBy,
//       transactionId,
//       status,
//       property: user.stayDetails?.propertyId,
//       receiptNumber,
//       userId: user._id,
//       remarks,
//       ...razorpayDetails,
//     });

//     await newDeposit.save({ session });

//     await createAccountLog({
//       logType: "Deposit",
//       action: "Payment",
//       description: `Deposit of ₹${amount} received from ${user.name}.`,
//       amount: amount,
//       propertyId: user.stayDetails?.propertyId,
//       performedBy: collectedBy || "System",
//       referenceId: newDeposit._id,
//     });

//     const paymentAccount =
//       paymentMethod === "Cash"
//         ? ACCOUNT_SYSTEM_NAMES.ASSET_CORE_CASH
//         : ACCOUNT_SYSTEM_NAMES.ASSET_CORE_BANK;

//     await createJournalEntry(
//       {
//         date: newDeposit.paymentDate,
//         description: `Deposit received from ${user.name}`,
//         propertyId: newDeposit.property,
//         transactions: [
//           { systemName: paymentAccount, debit: amount },
//           {
//             systemName: ACCOUNT_SYSTEM_NAMES.LIABILITY_SECURITY_DEPOSIT,
//             credit: amount,
//           },
//         ],
//         referenceId: newDeposit._id,
//         referenceType: "Deposit",
//       },
//       { session }
//     );

//     // Update user via RPC
//     const updateUserResponse = await sendRPCRequest(
//       USER_PATTERN.USER.UPDATE_USER,
//       {
//         userId,
//         userData: {
//           stayDetails: user.stayDetails,
//         },
//       }
//     );

//     if (!updateUserResponse.body.success) {
//       throw new Error("Failed to update user financial details.");
//     }

//     const updateUserReferral = await sendRPCRequest(
//       USER_PATTERN.REFERRAL.COMPLETE_REFERRAL,
//       {
//         newUserId: userId,
//       }
//     );

//     if (!updateUserReferral?.success) {
//       throw new Error("Failed to update user referral.");
//     }

//     const userEmail = updateUserResponse?.body?.data?.email;
//     if (!updateUserResponse.body.success) {
//       throw new Error("Failed to update user financial details.");
//     }

//     setImmediate(async () => {
//       try {
//         await Promise.all([
//           emailService.sendDepositFeeReceiptEmail(userEmail, newPayment),
//         ]);
//       } catch (err) {
//         console.error("Post-approval async error:", err);
//       }
//     });

//     await session.commitTransaction();
//     return {
//       success: true,
//       status: 201,
//       message: "Deposit recorded successfully.",
//       data: newDeposit,
//     };
//   } catch (error) {
//     await session.abortTransaction();
//     console.error("Error during deposit processing:", error);
//     return { success: false, status: 400, message: error.message };
//   } finally {
//     session.endSession();
//   }
// };

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
    // Fetch user
    const userResponse = await sendRPCRequest(
      USER_PATTERN.USER.GET_USER_BY_ID,
      { userId }
    );

    if (!userResponse.body.success) {
      throw new Error(userResponse.message || "User not found.");
    }

    const user = userResponse.body.data;
    const stay = user.stayDetails;

    const refundableDeposit = stay.refundableDeposit || 0;
    const nonRefundableDeposit = stay.nonRefundableDeposit || 0;

    const totalDepositRequired = refundableDeposit + nonRefundableDeposit;

    const depositAmountPaid = stay.depositAmountPaid || 0;
    const pendingTotal = totalDepositRequired - depositAmountPaid;

    if (pendingTotal <= 0) {
      throw new Error("All deposit amounts are already paid.");
    }

    if (amount > pendingTotal) {
      throw new Error(
        `Entered amount ₹${amount} exceeds pending deposit ₹${pendingTotal}.`
      );
    }

    // -------------------------------------------------------------------
    // 🔥 1. DETERMINE HOW MUCH WAS ALREADY PAID TOWARD REFUNDABLE
    // -------------------------------------------------------------------
    const refundablePaidAlready = Math.min(
      depositAmountPaid,
      refundableDeposit
    );

    const nonRefundablePaidAlready = depositAmountPaid - refundablePaidAlready;

    const refundablePending = refundableDeposit - refundablePaidAlready;
    const nonRefundablePending =
      nonRefundableDeposit - nonRefundablePaidAlready;

    // -------------------------------------------------------------------
    // 🔥 2. SPLIT CURRENT PAYMENT INTO REFUNDABLE + NON-REFUNDABLE PARTS
    // -------------------------------------------------------------------
    let remaining = amount;

    let refundablePart = 0;
    let nonRefundablePart = 0;

    if (refundablePending > 0) {
      refundablePart = Math.min(remaining, refundablePending);
      remaining -= refundablePart;
    }

    if (remaining > 0 && nonRefundablePending > 0) {
      nonRefundablePart = Math.min(remaining, nonRefundablePending);
      remaining -= nonRefundablePart;
    }

    // -------------------------------------------------------------------
    // 🔥 3. UPDATE stayDetails.totalDepositPaid ONLY
    // -------------------------------------------------------------------
    stay.depositAmountPaid = depositAmountPaid + amount;

    if (stay.depositAmountPaid === totalDepositRequired) {
      stay.depositStatus = "paid";
    }

    // -------------------------------------------------------------------
    // 🔥 4. CREATE RECEIPT NUMBER
    // -------------------------------------------------------------------
    const receiptNumber = await generateReceiptNumber(stay, session);

    // -------------------------------------------------------------------
    // 🔥 5. SAVE DEPOSIT RECORD
    // -------------------------------------------------------------------
    const newDeposit = new Deposits({
      name: user.name,
      userType: user.userType,
      contact: user.contact,
      refundableDeposit,
      nonRefundableDeposit,

      // store split
      refundablePaidNow: refundablePart,
      nonRefundablePaidNow: nonRefundablePart,

      amountPaid: amount,
      dueAmount: pendingTotal - amount,
      paymentMethod,
      paymentDate,
      collectedBy,
      transactionId,
      status: stay.depositStatus === "paid" ? "Paid" : "Pending",
      property: stay.propertyId,
      propertyName: stay.propertyName,
      receiptNumber,
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
      propertyId: stay.propertyId,
      performedBy: collectedBy || "System",
      referenceId: newDeposit._id,
    });

    // -------------------------------------------------------------------
    // 🔥 6. JOURNAL ENTRY (CORRECT ACCOUNT SPLITTING)
    // -------------------------------------------------------------------
    const paymentAccount =
      paymentMethod === "Cash"
        ? ACCOUNT_SYSTEM_NAMES.ASSET_CORE_CASH
        : ACCOUNT_SYSTEM_NAMES.ASSET_CORE_BANK;

    const journalTransactions = [{ systemName: paymentAccount, debit: amount }];

    if (refundablePart > 0) {
      journalTransactions.push({
        systemName: ACCOUNT_SYSTEM_NAMES.LIABILITY_SECURITY_DEPOSIT,
        credit: refundablePart,
      });
    }

    if (nonRefundablePart > 0) {
      journalTransactions.push({
        systemName: ACCOUNT_SYSTEM_NAMES.INCOME_DEPOSIT_NON_REFUNDABLE,
        credit: nonRefundablePart,
      });
    }

    await createJournalEntry(
      {
        date: newDeposit.paymentDate,
        description: `Deposit received from ${user.name}`,
        propertyId: newDeposit.property,
        transactions: journalTransactions,
        referenceId: newDeposit._id,
        referenceType: "Deposits",
      },
      { session }
    );

    // -------------------------------------------------------------------
    // 🔥 7. UPDATE USER IN USER SERVICE
    // -------------------------------------------------------------------
    const updateUserResponse = await sendRPCRequest(
      USER_PATTERN.USER.UPDATE_USER,
      {
        userId,
        userData: { stayDetails: stay },
      }
    );

    if (!updateUserResponse.body.success) {
      throw new Error("Failed to update user financial details.");
    }

    // -------------------------------------------------------------------
    // 🔥 8. COMPLETE REFERRAL
    // -------------------------------------------------------------------
    await sendRPCRequest(USER_PATTERN.REFERRAL.COMPLETE_REFERRAL, {
      newUserId: userId,
    });

    // -------------------------------------------------------------------
    // 🔥 9. SEND EMAIL ASYNC
    // -------------------------------------------------------------------
    setImmediate(async () => {
      try {
        const userEmail = updateUserResponse?.body?.data?.email;
        const cleanDeposit = JSON.parse(JSON.stringify(newDeposit));
        await emailService.sendDepositFeeReceiptEmail(userEmail, cleanDeposit);
      } catch (err) {
        console.error("Post-approval async error:", err);
      }
    });

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

    const paymentAccount =
      paymentMethod === "Cash"
        ? ACCOUNT_SYSTEM_NAMES.ASSET_CORE_CASH
        : ACCOUNT_SYSTEM_NAMES.ASSET_CORE_BANK;

    await createJournalEntry(
      {
        date: newDeposit.paymentDate,
        description: `Deposit refund to ${user.name}`,
        propertyId: newDeposit.property,
        transactions: [
          {
            accountName: ACCOUNT_SYSTEM_NAMES.LIABILITY_SECURITY_DEPOSIT,
            debit: Number(amount),
          },
          { accountName: paymentAccount, credit: Number(amount) },
        ],
        referenceId: newDeposit._id,
        referenceType: "Deposit", // Use 'Deposit' for consistency
      },
      { session }
    );

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

    const propertyId = user.stayDetails?.propertyId;
    let keyId = null;
    let keySecret = null;

    if (propertyId) {
      const propertyResponse = await sendRPCRequest(
        PROPERTY_PATTERN.PROPERTY.GET_PROPERTY_BY_ID,
        { id: propertyId }
      );
      if (
        propertyResponse.success &&
        propertyResponse.data?.razorpayCredentials
      ) {
        keyId = propertyResponse.data.razorpayCredentials.keyId;
        keySecret = propertyResponse.data.razorpayCredentials.keySecret;
      }
    }

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

    const razorpayResponse = await createRazorpayOrderId(
      paymentAmount,
      keyId,
      keySecret
    );
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
        keyId: keyId || process.env.RAZORPAY_KEY_ID,
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

  let keySecret = null;
  try {
    const userResponse = await sendRPCRequest(
      USER_PATTERN.USER.GET_USER_BY_ID,
      { userId }
    );
    if (userResponse.body.success) {
      const user = userResponse.body.data;
      const propertyId = user.stayDetails?.propertyId;
      if (propertyId) {
        const propertyResponse = await sendRPCRequest(
          PROPERTY_PATTERN.PROPERTY.GET_PROPERTY_BY_ID,
          { id: propertyId }
        );
        if (
          propertyResponse.success &&
          propertyResponse.data?.razorpayCredentials
        ) {
          keySecret = propertyResponse.data.razorpayCredentials.keySecret;
        }
      }
    }
  } catch (error) {
    console.error("Error fetching property credentials:", error);
  }

  const isVerified = await verifyRazorpaySignature(
    {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    },
    keySecret
  );
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

  if (transactionId) {
    const existingTxn = await Deposits.findOne({ transactionId });

    if (existingTxn) {
      return {
        success: false,
        status: 400,
        message: "This transaction ID already exists.",
      };
    }
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
          "name userType nonRefundableDeposit refundableDeposit amountPaid paymentMethod paymentDate transactionId handledBy remarks property receiptNumber";
      } else {
        projection =
          "name userType nonRefundableDeposit refundableDeposit amountPaid paymentMethod transactionId collectedBy paymentDate remarks property receiptNumber";
      }
    } else {
      projection =
        "name userType nonRefundableDeposit refundableDeposit amountPaid paymentMethod transactionId collectedBy paymentDate remarks property receiptNumber";
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

export const getTransactionHistoryByUserId = async (data) => {
  try {
    const { userId } = data;

    if (!userId) {
      return {
        success: false,
        status: 400,
        message: "User ID is required",
        data: [],
      };
    }

    const payments = await Deposits.find({ userId })
      .sort({ paymentDate: -1 }) // latest first
      .lean();

    if (!payments || payments.length === 0) {
      return {
        success: true,
        status: 200,
        message: "No payments found for this user",
        data: [],
      };
    }

    return {
      success: true,
      status: 200,
      message: "Payments fetched successfully",
      data: payments,
    };
  } catch (error) {
    console.error("Error in transactions:", error);
    return {
      success: false,
      status: 500,
      message: "Internal server error while fetching transactions",
      error: error.message,
    };
  }
};
