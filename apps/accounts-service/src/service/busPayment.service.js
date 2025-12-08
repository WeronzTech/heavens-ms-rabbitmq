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
import BusPayments from "../models/busPayments.model.js";

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

const processAndRecordBusPayment = async ({
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
    const busFee = user.busFee;

    const totalBusFeeRequired = busFee.yearlyAmount || 0;

    const busFeeAmountPaid = busFee.amountPaid || 0;
    const pendingTotal = totalBusFeeRequired - busFeeAmountPaid;

    if (pendingTotal <= 0) {
      throw new Error("All bus fee amounts are already paid.");
    }

    if (amount > pendingTotal) {
      throw new Error(
        `Entered amount ₹${amount} exceeds pending bus fee ₹${pendingTotal}.`
      );
    }

    busFee.amountPaid = busFeeAmountPaid + amount;
    busFee.dueAmount = totalBusFeeRequired - (busFeeAmountPaid + amount);

    if (busFee.amountPaid === totalBusFeeRequired) {
      busFee.status = "paid";
    }

    const receiptNumber = await generateReceiptNumber(stay, session);

    const newBusFee = new BusPayments({
      name: user.name,
      userType: user.userType,
      contact: user.contact,
      busFee: user.busFee?.yearlyAmount,
      amountPaid: amount,
      dueAmount: pendingTotal - amount,
      paymentMethod,
      paymentDate,
      collectedBy,
      transactionId,
      status: busFee.status === "paid" ? "Paid" : "Pending",
      property: {
        id: user.stayDetails?.propertyId,
        name: user.stayDetails?.propertyName,
      },
      receiptNumber,
      userId: user._id,
      remarks,
      ...razorpayDetails,
    });

    await newBusFee.save({ session });

    await createAccountLog({
      logType: "BusFee",
      action: "Payment",
      description: `Bus Fee of ₹${amount} received from ${user.name}.`,
      amount: amount,
      propertyId: stay.propertyId,
      performedBy: collectedBy || "System",
      referenceId: newBusFee._id,
    });

    const paymentAccount =
      paymentMethod === "Cash"
        ? ACCOUNT_SYSTEM_NAMES.ASSET_CORE_CASH
        : ACCOUNT_SYSTEM_NAMES.ASSET_CORE_BANK;

    // Student pays → you owe bus owner → Liability increases
    const journalTransactions = [
      {
        systemName: paymentAccount,
        debit: amount, // Money received
      },
      {
        systemName: ACCOUNT_SYSTEM_NAMES.LIABILITY_BUS_FEE_PAYABLE,
        credit: amount, // Liability created
      },
    ];

    await createJournalEntry(
      {
        date: newBusFee.paymentDate,
        description: `Bus Fee collected from ${user.name}`,
        propertyId: newBusFee.property.id,
        transactions: journalTransactions,
        referenceId: newBusFee._id,
        referenceType: "BusPayments",
      },
      { session }
    );

    const updateUserResponse = await sendRPCRequest(
      USER_PATTERN.USER.UPDATE_USER,
      {
        userId,
        userData: { stayDetails: stay, busFee: busFee },
      }
    );

    if (!updateUserResponse.body.success) {
      throw new Error("Failed to update user financial details.");
    }

    setImmediate(async () => {
      try {
        const userEmail = updateUserResponse?.body?.data?.email;
        const cleanBusFee = JSON.parse(JSON.stringify(newBusFee));
        await emailService.sendBusFeeReceiptEmail(userEmail, cleanBusFee);
      } catch (err) {
        console.error("Post-approval async error:", err);
      }
    });

    await session.commitTransaction();

    return {
      success: true,
      status: 201,
      message: "Bus fee recorded successfully.",
      data: newBusFee,
    };
  } catch (error) {
    await session.abortTransaction();
    console.log("Error during bus fee processing:", error);
    return { success: false, status: 400, message: error.message };
  } finally {
    session.endSession();
  }
};

export const initiateOnlineBusPayment = async (data) => {
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
    const { busFee } = user;

    let totalBusFeeAmount = busFee.yearlyAmount;
    let pendingBusFee = totalBusFeeAmount - busFee.amountPaid;

    const currentPendingBusFee = pendingBusFee || 0;

    if (currentPendingBusFee > 0 && paymentAmount < currentPendingBusFee) {
      return {
        success: false,
        status: 400,
        message: `Your payment of ₹${paymentAmount} is less than the pending bus fee of ₹${currentPendingDeposit}. Please pay at least ₹${currentPendingBusFee} to proceed with the bus fee.`,
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

export const verifyAndRecordOnlineBusPayment = async (data) => {
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    userId,
    amount,
  } = data;
  console.log(data);
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

  return await processAndRecordBusPayment({
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

export const recordManualBusPayment = async (data) => {
  const {
    userId,
    amount,
    paymentMethod,
    paymentDate,
    collectedBy,
    transactionId,
    remarks,
  } = data;
  console.log(data);
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

  return await processAndRecordBusPayment({
    userId,
    amount: Number(amount),
    paymentMethod,
    paymentDate,
    collectedBy,
    transactionId,
    remarks,
  });
};

export const getAllBusPayments = async (data) => {
  try {
    const {
      propertyId,
      page = 1,
      limit = 10,
      userType,
      paymentMethod,
      paymentMonth,
      paymentYear,
      search,
    } = data;

    // ---------------------------
    // BUILD QUERY FILTERS
    // ---------------------------
    const mainQuery = {};

    // Property filter
    if (propertyId && propertyId !== "all" && propertyId !== "undefined") {
      mainQuery["property.id"] = propertyId;
    }

    // Filter by payment method
    if (paymentMethod) {
      mainQuery.paymentMethod = paymentMethod;
    }

    // Filter by user type
    if (userType) {
      mainQuery.userType = userType;
    }

    // Month + Year filter
    if (paymentMonth && paymentYear) {
      const start = new Date(paymentYear, paymentMonth - 1, 1);
      const end = new Date(paymentYear, paymentMonth, 1);

      mainQuery.paymentDate = { $gte: start, $lt: end };
    }

    // Search filter (name or transactionId)
    if (search) {
      const regex = new RegExp(search, "i");
      mainQuery.$or = [{ name: regex }, { transactionId: regex }];
    }

    // Pagination
    const skip = (page - 1) * limit;

    // ---------------------------
    // FETCH RECORDS
    // ---------------------------
    const busPayments = await BusPayments.find(mainQuery)
      .sort({ paymentDate: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const totalDocs = await BusPayments.countDocuments(mainQuery);

    // ---------------------------
    // AGGREGATION → TOTAL RECEIVED AMOUNT
    // ---------------------------
    const aggregationMatch = { ...mainQuery };

    const totalAggregation = await BusPayments.aggregate([
      { $match: aggregationMatch },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: "$amountPaid" },
        },
      },
    ]);

    const totalReceivedAmount = totalAggregation[0]?.totalAmount || 0;

    // ---------------------------
    // RESPONSE
    // ---------------------------
    return {
      success: true,
      status: 200,
      totalReceivedAmount,
      data: busPayments,
      pagination: {
        total: totalDocs,
        page,
        limit,
        pages: Math.ceil(totalDocs / limit),
      },
    };
  } catch (error) {
    console.error("Get All Bus Payments Service Error:", error);
    return {
      success: false,
      status: 500,
      message: "Internal Server Error",
      error: error.message,
    };
  }
};

export const getLatestBusPaymentsByUsers = async ({ userIds }) => {
  try {
    const deposits = await BusPayments.aggregate([
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

    const payments = await BusPayments.find({ userId })
      .sort({ createdAt: -1 }) // latest first
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
