import Payments from "../models/feePayments.model.js";
import { USER_PATTERN } from "../../../../libs/patterns/user/user.pattern.js";
import { sendRPCRequest } from "../../../../libs/common/rabbitMq.js";
import {
  createRazorpayOrderId,
  verifyPayment as verifyRazorpaySignature,
} from "../../../../libs/common/razorpay.js";
import mongoose from "mongoose";
import Expense from "../models/expense.model.js";
import Commission from "../models/commission.model.js";
import moment from "moment";
import { createAccountLog } from "./accountsLog.service.js";
import { SOCKET_PATTERN } from "../../../../libs/patterns/socket/socket.pattern.js";
import StaffSalaryHistory from "../models/staffSalaryHistory.model.js";
import Deposits from "../models/depositPayments.model.js";

export const addFeePayment = async (data) => {
  try {
    const {
      name,
      contact,
      room,
      rent,
      amount,
      dueAmount,
      waveOffAmount = 0,
      waveOffReason = "",
      accountBalance,
      paymentMethod,
      transactionId = "",
      collectedBy = "",
      fullyClearedRentMonths = [],
      paymentType,
      paymentDate = new Date(),
      status = "Pending",
      remarks = "",
      property = {},
      receiptNumber = "",
      razorpayOrderId = "",
      razorpayPaymentId = "",
      razorpaySignature = "",
      clientId = "",
      userId,
    } = data;

    // ✅ Validate required fields with better error messages
    const requiredFields = {
      name: "Tenant Name",
      contact: "Contact Number",
      room: "Room Number",
      rent: "Rent Amount",
      amount: "Payment Amount",
      dueAmount: "Due Amount",
      accountBalance: "Account Balance",
      paymentMethod: "Payment Method",
      paymentType: "Payment Type",
      userId: "User ID",
    };

    const missingFields = Object.entries(requiredFields)
      .filter(([field]) => !data[field] && data[field] !== 0)
      .map(([_, fieldName]) => fieldName);

    if (missingFields.length > 0) {
      return {
        success: false,
        status: 400,
        message: `Missing required fields: ${missingFields.join(", ")}`,
      };
    }

    // ✅ Validate payment method specific requirements
    if (
      (paymentMethod === "UPI" || paymentMethod === "Bank Transfer") &&
      !transactionId
    ) {
      return {
        success: false,
        status: 400,
        message:
          "Transaction ID is required for UPI and Bank Transfer payments",
      };
    }

    // ✅ Prepare payment data with proper formatting
    const paymentData = {
      name: name?.toString().trim(),
      contact: contact?.toString().trim(),
      room: room?.toString().trim(),
      rent: parseFloat(rent) || 0,
      amount: parseFloat(amount) || 0,
      dueAmount: parseFloat(dueAmount) || 0,
      waveOffAmount: parseFloat(waveOffAmount) || 0,
      waveOffReason: waveOffReason?.toString().trim(),
      accountBalance: parseFloat(accountBalance) || 0,
      paymentMethod: paymentMethod?.toString().trim(),
      transactionId: transactionId?.toString().trim(),
      collectedBy: collectedBy?.toString().trim(),
      fullyClearedRentMonths: Array.isArray(fullyClearedRentMonths)
        ? fullyClearedRentMonths.map((month) => month.toString().trim())
        : [],
      paymentType: paymentType?.toString().trim(),
      paymentDate: new Date(paymentDate),
      status: status?.toString().trim(),
      remarks: remarks?.toString().trim(),
      property: property || {}, // Use provided property data directly
      receiptNumber: receiptNumber?.toString().trim(),
      razorpayOrderId: razorpayOrderId?.toString().trim(),
      razorpayPaymentId: razorpayPaymentId?.toString().trim(),
      razorpaySignature: razorpaySignature?.toString().trim(),
      clientId: clientId?.toString().trim(),
      userId: userId?.toString().trim(),
    };

    // ✅ Save Payment
    const payment = new Payments(paymentData);
    await payment.save();

    return {
      success: true,
      status: 201,
      message: "Payment recorded successfully",
      data: payment,
    };
  } catch (error) {
    console.error("Payment Service Error:", error);
    return {
      success: false,
      status: 500,
      message: "Internal Server Error",
      error: error.message,
    };
  }
};

export const updateFeePayment = async (paymentId, updateData) => {
  try {
    const {
      name,
      contact,
      room,
      rent,
      amount,
      dueAmount,
      waveOffAmount,
      waveOffReason,
      accountBalance,
      paymentMethod,
      transactionId,
      collectedBy,
      fullyClearedRentMonths,
      paymentType,
      paymentDate,
      status,
      remarks,
      property,
      receiptNumber,
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      clientId,
      userId,
    } = updateData;

    // ✅ Check if payment exists
    const existingPayment = await Payments.findById(paymentId);
    if (!existingPayment) {
      return {
        success: false,
        status: 404,
        message: "Payment not found",
      };
    }

    // ✅ Prepare update data
    const updateFields = {};

    if (name !== undefined) updateFields.name = name.toString().trim();
    if (contact !== undefined) updateFields.contact = contact.toString().trim();
    if (room !== undefined) updateFields.room = room.toString().trim();
    if (rent !== undefined) updateFields.rent = parseFloat(rent) || 0;
    if (amount !== undefined) updateFields.amount = parseFloat(amount) || 0;
    if (dueAmount !== undefined)
      updateFields.dueAmount = parseFloat(dueAmount) || 0;
    if (waveOffAmount !== undefined)
      updateFields.waveOffAmount = parseFloat(waveOffAmount) || 0;
    if (waveOffReason !== undefined)
      updateFields.waveOffReason = waveOffReason.toString().trim();
    if (accountBalance !== undefined)
      updateFields.accountBalance = parseFloat(accountBalance) || 0;
    if (paymentMethod !== undefined)
      updateFields.paymentMethod = paymentMethod.toString().trim();
    if (transactionId !== undefined)
      updateFields.transactionId = transactionId.toString().trim();
    if (collectedBy !== undefined)
      updateFields.collectedBy = collectedBy.toString().trim();
    if (fullyClearedRentMonths !== undefined) {
      updateFields.fullyClearedRentMonths = Array.isArray(
        fullyClearedRentMonths
      )
        ? fullyClearedRentMonths.map((month) => month.toString().trim())
        : [];
    }
    if (paymentType !== undefined)
      updateFields.paymentType = paymentType.toString().trim();
    if (paymentDate !== undefined)
      updateFields.paymentDate = new Date(paymentDate);
    if (status !== undefined) updateFields.status = status.toString().trim();
    if (remarks !== undefined) updateFields.remarks = remarks.toString().trim();
    if (property !== undefined) updateFields.property = property;
    if (receiptNumber !== undefined)
      updateFields.receiptNumber = receiptNumber.toString().trim();
    if (razorpayOrderId !== undefined)
      updateFields.razorpayOrderId = razorpayOrderId.toString().trim();
    if (razorpayPaymentId !== undefined)
      updateFields.razorpayPaymentId = razorpayPaymentId.toString().trim();
    if (razorpaySignature !== undefined)
      updateFields.razorpaySignature = razorpaySignature.toString().trim();
    if (clientId !== undefined)
      updateFields.clientId = clientId.toString().trim();
    if (userId !== undefined) updateFields.userId = userId.toString().trim();

    // ✅ Validate payment method specific requirements if paymentMethod is being updated
    if (
      updateFields.paymentMethod &&
      (updateFields.paymentMethod === "UPI" ||
        updateFields.paymentMethod === "Bank Transfer") &&
      !updateFields.transactionId
    ) {
      return {
        success: false,
        status: 400,
        message:
          "Transaction ID is required for UPI and Bank Transfer payments",
      };
    }

    // ✅ Update payment
    const updatedPayment = await Payments.findByIdAndUpdate(
      paymentId,
      { $set: updateFields },
      { new: true, runValidators: true }
    );

    return {
      success: true,
      status: 200,
      message: "Payment updated successfully",
      data: updatedPayment,
    };
  } catch (error) {
    console.error("Update Payment Service Error:", error);
    return {
      success: false,
      status: 500,
      message: "Internal Server Error",
      error: error.message,
    };
  }
};

export const getFeePaymentById = async (data) => {
  try {
    // Extract paymentId from data object
    const { paymentId } = data;

    // Validate paymentId exists
    if (!paymentId) {
      return {
        success: false,
        status: 400,
        message: "Payment ID is required",
      };
    }

    // Check if paymentId is an empty object
    if (typeof paymentId === "object" && Object.keys(paymentId).length === 0) {
      return {
        success: false,
        status: 400,
        message: "Invalid payment ID: empty object",
      };
    }

    // Check if it's a valid ObjectId
    if (
      typeof paymentId === "string" &&
      !mongoose.Types.ObjectId.isValid(paymentId)
    ) {
      return {
        success: false,
        status: 400,
        message: "Invalid payment ID format",
      };
    }

    const payment = await Payments.findById(paymentId);
    if (!payment) {
      return {
        success: false,
        status: 404,
        message: "Payment not found",
      };
    }

    return {
      success: true,
      status: 200,
      data: payment,
    };
  } catch (error) {
    console.error("Get Payment Service Error:", error);
    return {
      success: false,
      status: 500,
      message: "Internal Server Error",
      error: error.message,
    };
  }
};

const processAndRecordPayment = async ({
  userId,
  amount,
  paymentMethod,
  transactionId = null,
  razorpayDetails = {},
  waveOffAmount = 0, // New field
  waveOffReason = null, // New field
  paymentDate,
  collectedBy = "",
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
    console.log(user);
    let paymentForMonths = [];
    let advanceForMonths = [];

    if (user.rentType === "daily" || user.rentType === "mess") {
      const pending = user.financialDetails.pendingAmount || 0;
      const totalCredit = amount + waveOffAmount;

      if (totalCredit < pending) {
        throw new Error(
          `Payment plus wave-off must be at least the pending amount of ₹${pending}.`
        );
      }
      user.financialDetails.pendingAmount -= totalCredit;
      if (user.financialDetails.pendingAmount <= 0) {
        user.paymentStatus = "paid";
      }
    } else if (user.rentType === "monthly") {
      const monthlyRent = user.financialDetails.monthlyRent || 0;
      if (monthlyRent <= 0) throw new Error("Monthly rent is not set.");

      const { clearedTillMonth } = user.financialDetails;
      if (clearedTillMonth) {
        const today = moment();
        const nextDueMonth = moment(clearedTillMonth, "YYYY-MM").add(
          1,
          "months"
        );
        if (today.isAfter(nextDueMonth)) {
          const monthsDue = today.diff(nextDueMonth, "months") + 1;
          user.financialDetails.pendingRent = monthsDue * monthlyRent;
        }
      }

      const currentBalance = user.financialDetails.accountBalance || 0;
      const currentPendingRent = user.financialDetails.pendingRent || 0;

      // The total credit for this transaction includes payment, balance, and any wave-off
      const totalAvailableAmount = amount + currentBalance + waveOffAmount;

      if (currentPendingRent > 0 && totalAvailableAmount < monthlyRent) {
        throw new Error(
          `To clear your due, payment of ₹${amount} plus wave-off of ₹${waveOffAmount} and advance of ₹${currentBalance} must be at least the monthly rent of ₹${monthlyRent}.`
        );
      }

      let monthsCleared = Math.floor(totalAvailableAmount / monthlyRent);
      let newAccountBalance = totalAvailableAmount % monthlyRent;

      user.financialDetails.accountBalance = newAccountBalance;
      user.financialDetails.pendingRent =
        currentPendingRent - monthsCleared * monthlyRent;
      if (user.financialDetails.pendingRent <= 0) {
        user.financialDetails.pendingRent = 0;
        user.paymentStatus = "paid";
      }

      if (monthsCleared > 0) {
        const lastClearedDate = user.financialDetails.clearedTillMonth
          ? new Date(`${user.financialDetails.clearedTillMonth}-01`)
          : new Date(user.stayDetails.joinDate);

        if (!user.financialDetails.clearedTillMonth) {
          lastClearedDate.setMonth(lastClearedDate.getMonth() - 1);
        }

        for (let i = 0; i < monthsCleared; i++) {
          const paymentMonthDate = new Date(lastClearedDate);
          paymentMonthDate.setMonth(paymentMonthDate.getMonth() + i + 1);
          paymentForMonths.push(
            paymentMonthDate.toLocaleString("default", {
              month: "long",
              year: "numeric",
            })
          );
        }

        const finalClearedDate = new Date(lastClearedDate);
        finalClearedDate.setMonth(finalClearedDate.getMonth() + monthsCleared);

        user.financialDetails.clearedTillMonth = `${finalClearedDate.getFullYear()}-${String(
          finalClearedDate.getMonth() + 1
        ).padStart(2, "0")}`;
        user.financialDetails.nextDueDate = new Date(
          finalClearedDate.getFullYear(),
          finalClearedDate.getMonth() + 1,
          5
        );
        if (newAccountBalance > 0) {
          const lastPaidMonth = user.financialDetails.clearedTillMonth
            ? moment(user.financialDetails.clearedTillMonth, "YYYY-MM")
            : moment(user.stayDetails.joinDate).subtract(1, "month");
          const advanceMonth = lastPaidMonth.clone().add(1, "months");
          advanceForMonths.push(advanceMonth.format("MMMM YYYY"));
        }
      } else {
        const lastPaidMonth = user.financialDetails.clearedTillMonth
          ? moment(user.financialDetails.clearedTillMonth, "YYYY-MM")
          : moment(user.stayDetails.joinDate).subtract(1, "month");
        const advanceMonth = lastPaidMonth.clone().add(1, "months");
        advanceForMonths.push(advanceMonth.format("MMMM YYYY"));
      }
    }

    // Create the Payment Record
    const newPayment = new Payments({
      name: user.name,
      rentType: user.rentType,
      userType: user.userType,
      contact: user.contact,
      room: user.stayDetails?.roomNumber || "N/A",
      rent: user.financialDetails?.monthlyRent || 0,
      amount: amount,
      waveOffAmount: waveOffAmount,
      waveOffReason: waveOffReason,
      accountBalance: user.financialDetails?.accountBalance || 0,
      dueAmount:
        user.financialDetails?.pendingRent ||
        user.financialDetails?.pendingAmount,
      paymentMethod,
      paymentDate,
      transactionId,
      paymentForMonths,
      advanceForMonths,
      status: "Paid",
      property: {
        id: user.stayDetails?.propertyId,
        name: user.stayDetails?.propertyName,
      },
      userId: user._id,
      collectedBy,
      remarks,
      ...razorpayDetails,
    });

    await newPayment.save({ session });

    const userIdsToNotify = ["688722e075ee06d71c8fdb02"];

    userIdsToNotify.push(user._id);

    const socket = await sendRPCRequest(SOCKET_PATTERN.EMIT, {
      userIds: userIdsToNotify,
      event: "next-due-date",
      data: user,
    });

    await createAccountLog({
      logType: "Fee Payment",
      action: "Payment",
      description: `Fee payment of ₹${amount} received from ${user.name}.`,
      amount: amount,
      propertyId: user.stayDetails?.propertyId,
      performedBy: collectedBy || "System",
      referenceId: newPayment._id,
    });

    // Update user via RPC
    const updateUserResponse = await sendRPCRequest(
      USER_PATTERN.USER.UPDATE_USER,
      {
        userId,
        userData: {
          financialDetails: user.financialDetails,
          paymentStatus: user.paymentStatus,
        },
      }
    );

    if (!updateUserResponse.body.success) {
      throw new Error("Failed to update user financial details.");
    }

    const updateUserReferral = await sendRPCRequest(
      USER_PATTERN.REFERRAL.COMPLETE_REFERRAL,
      {
        newUserId: userId,
      }
    );

    if (!updateUserReferral?.success) {
      throw new Error("Failed to update user referral.");
    }

    await session.commitTransaction();
    return {
      success: true,
      status: 201,
      message: "Payment recorded successfully.",
      data: newPayment,
    };
  } catch (error) {
    await session.abortTransaction();
    console.error("Error during payment processing:", error);
    return { success: false, status: 400, message: error.message };
  } finally {
    session.endSession();
  }
};

export const initiateOnlinePayment = async (data) => {
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
    const { rentType, financialDetails } = user;
    const { pendingAmount, monthlyRent, accountBalance, pendingRent } =
      financialDetails;

    if (rentType === "daily" || rentType === "mess") {
      const pending = pendingAmount || 0;
      if (paymentAmount < pending) {
        return {
          success: false,
          status: 400,
          message: `Payment amount must be at least the pending amount of ₹${pending}.`,
        };
      }
    } else if (rentType === "monthly") {
      const currentPendingRent = pendingRent || 0;
      const currentBalance = accountBalance || 0;
      const rent = monthlyRent || 0;
      const totalAvailableAmount = paymentAmount + currentBalance;

      if (rent <= 0) {
        return {
          success: false,
          status: 400,
          message: "Monthly rent is not set for this user.",
        };
      }

      if (currentPendingRent > 0 && totalAvailableAmount < rent) {
        return {
          success: false,
          status: 400,
          message: `To clear your due, the payment of ₹${paymentAmount} plus your advance of ₹${currentBalance} must be at least the monthly rent of ₹${rent}.`,
        };
      }
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

export const verifyAndRecordOnlinePayment = async (data) => {
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

  return await processAndRecordPayment({
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

export const recordManualPayment = async (data) => {
  const {
    userId,
    amount,
    paymentMethod,
    transactionId,
    waveOffAmount,
    waveOffReason,
    paymentDate,
    collectedBy,
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
  // New validation for wave-off
  if (waveOffAmount && !waveOffReason) {
    return {
      success: false,
      status: 400,
      message: "A reason is required when providing a wave-off amount.",
    };
  }

  return await processAndRecordPayment({
    userId,
    amount: Number(amount),
    paymentMethod,
    transactionId,
    waveOffAmount: Number(waveOffAmount) || 0,
    waveOffReason,
    paymentDate,
    collectedBy,
    remarks,
  });
};

export const getAllFeePayments = async (data) => {
  try {
    const {
      propertyId,
      rentType,
      userType,
      page,
      limit,
      paymentMethod,
      paymentMonth,
      paymentYear,
      search,
    } = data;

    const filter = {};

    // Filter by property
    if (propertyId) {
      filter["property.id"] = new mongoose.Types.ObjectId(propertyId);
    }

    // Filter by rent type
    if (rentType) {
      filter.rentType = rentType.trim();
    }

    if (userType) {
      filter.userType = userType.trim();
    }

    // 🔹 Filter by payment method
    if (paymentMethod) {
      filter.paymentMethod = paymentMethod.trim();
    }

    // 🔹 Filter by payment month and year (based on paymentDate)
    if (paymentMonth && paymentYear) {
      const startDate = new Date(paymentYear, paymentMonth - 1, 1); // first day of month
      const endDate = new Date(paymentYear, paymentMonth, 0, 23, 59, 59, 999); // last day of month
      filter.paymentDate = { $gte: startDate, $lte: endDate };
    }

    // 🔹 Search by name or transactionId (case-insensitive)
    if (search) {
      const regex = new RegExp(search.trim(), "i");
      filter.$or = [{ name: regex }, { transactionId: regex }];
    }

    // Fields to select
    const projection =
      "name rent paymentMethod userType transactionId collectedBy paymentDate amount";

    // Query with pagination
    const payments = await Payments.find(filter, projection)
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ paymentDate: -1, createdAt: -1 })
      .lean();

    // Get total count for pagination metadata
    const total = await Payments.countDocuments(filter);

    const totalAgg = await Payments.aggregate([
      { $match: filter },
      { $group: { _id: null, totalReceived: { $sum: "$amount" } } },
    ]);

    const totalReceived = totalAgg.length > 0 ? totalAgg[0].totalReceived : 0;

    const yearQuery = {};
    if (propertyId) {
      yearQuery["property.id"] = new mongoose.Types.ObjectId(propertyId);
    }

    const availableYears = await Payments.aggregate([
      { $match: yearQuery },
      {
        $group: {
          _id: { $year: "$paymentDate" },
        },
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          year: "$_id",
          _id: 0,
        },
      },
    ]);

    return {
      success: true,
      status: 200,
      totalReceived,
      data: payments,
      availableYears: availableYears.map((y) => y.year),
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    console.error("Get All Fee Payments Service Error:", error);
    return {
      success: false,
      status: 500,
      message: "Internal Server Error",
      error: error.message,
    };
  }
};

export const getMonthWiseRentCollection = async () => {
  try {
    // Use native MongoDB driver directly
    const db = mongoose.connection.db;
    const paymentsCollection = db.collection("payments");

    // Get all payments without Mongoose interference
    const payments = await paymentsCollection
      .find(
        {},
        {
          projection: { paymentDate: 1, amount: 1 },
        }
      )
      .toArray();

    // Process the data
    const monthlyData = new Map();

    for (const payment of payments) {
      if (!payment.paymentDate) continue;

      try {
        const date = new Date(payment.paymentDate);
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const key = `${year}-${month.toString().padStart(2, "0")}`;

        if (!monthlyData.has(key)) {
          monthlyData.set(key, { year, month, totalCollection: 0, count: 0 });
        }

        const monthData = monthlyData.get(key);
        monthData.totalCollection += parseFloat(payment.amount) || 0;
        monthData.count += 1;
      } catch (error) {
        console.log("Skipping invalid payment:", payment._id);
        continue;
      }
    }

    // Convert to array and sort
    const result = Array.from(monthlyData.values()).sort((a, b) => {
      return a.year === b.year ? a.month - b.month : a.year - b.year;
    });
    return {
      success: true,
      status: 200,
      data: result,
    };
  } catch (error) {
    console.error("Month Wise Rent Collection Error:", error);
    return {
      success: false,
      status: 500,
      message: "Internal Server Error",
      error: error.message,
    };
  }
};

export const getLatestPaymentsByUsers = async ({ userIds }) => {
  try {
    const payments = await Payments.aggregate([
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
          amount: { $first: "$amount" },
        },
      },
      {
        $project: {
          userId: "$_id",
          paymentDate: 1,
          amount: 1,
          _id: 0,
        },
      },
    ]);

    return { success: true, status: 200, data: payments };
  } catch (err) {
    return { success: false, status: 500, message: err.message };
  }
};

export const getFinancialSummary = async (data) => {
  try {
    let propertyId;
    let rentType;
    // Handle both cases: data could be string (propertyId) or object
    if (typeof data === "string") {
      propertyId = data;
    } else if (typeof data === "object" && data !== null) {
      propertyId = data.propertyId;
      rentType = data.rentType;
    }

    // Build match condition
    const matchCondition = { status: "Paid" };
    if (propertyId) {
      matchCondition.propertyId = new mongoose.Types.ObjectId(propertyId);
    }
    if (rentType) {
      matchCondition.rentType = rentType;
    }

    // Aggregate collected amounts per month (all years)
    const collected = await Payments.aggregate([
      { $match: matchCondition },
      {
        $group: {
          _id: {
            year: { $year: "$paymentDate" },
            month: { $month: "$paymentDate" },
          },
          totalCollected: { $sum: "$amount" },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    // Format response: only months that have payments
    const summary = collected.map((c) => ({
      year: c._id.year,
      month: monthNames[c._id.month - 1],
      collected: c.totalCollected,
    }));

    return {
      success: true,
      status: 200,
      data: summary,
    };
  } catch (error) {
    console.error("Financial Summary Service Error:", error);
    return {
      success: false,
      status: 500,
      message: "Internal Server Error",
      error: error.message,
    };
  }
};

export const getNextDueDate = async (data) => {
  try {
    const { userId } = data;

    const userResponse = await sendRPCRequest(
      USER_PATTERN.USER.GET_USER_BY_ID,
      { userId }
    );

    if (!userResponse.body.success) {
      return { success: false, status: 404, message: "User not found." };
    }
    const user = userResponse.body.data;

    console.log("user", user.financialDetails);

    const { nextDueDate, pendingRent } = user.financialDetails;

    // Get last payment details
    const lastPayment = await Payments.findOne({ userId })
      .sort({ paymentDate: -1 })
      .limit(1);

    const today = new Date();
    const dueDate = new Date(nextDueDate);
    const daysLeft = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24)) - 1;

    return {
      success: true,
      status: 200,
      data: {
        paymentDate: dueDate.toISOString(),
        pendingAmount: pendingRent,
        daysLeft: daysLeft > 0 ? daysLeft : 0,
        lastPayedDate: lastPayment?.paymentDate.toISOString() || null,
        lastPayedAmount: lastPayment?.amount || 0,
      },
    };
  } catch (err) {
    console.error("Getting due date Service Error:", err);
    return {
      success: false,
      status: 500,
      message: "Internal Server Error",
      error: err.message,
    };
  }
};

export const getAllAccountsPayments = async (data) => {
  try {
    const { propertyId } = data || {}; // get propertyId from data
    const filter = propertyId ? { "property.id": propertyId } : {};

    const payments = await Payments.find(filter).sort({ createdAt: -1 }).lean();
    const expenses = await Expense.find(filter).sort({ createdAt: -1 }).lean();
    const commissions = await Commission.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    return {
      success: true,
      status: 200,
      data: {
        payments,
        expenses,
        commissions,
      },
    };
  } catch (error) {
    console.error("[ACCOUNTS] Error in getAllAccountsPayments:", error);
    return {
      success: false,
      status: 500,
      message:
        "An internal server error occurred while fetching all accounts summary.",
      error: error.message,
    };
  }
};

export const getFeePaymentsByUserId = async (data) => {
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

    const payments = await Payments.find({ userId }).lean();

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
    console.error("Error in getFeePaymentsByUserId:", error);
    return {
      success: false,
      status: 500,
      message: "Internal server error while fetching payments",
      error: error.message,
    };
  }
};

export const getWaveOffedPayments = async (data) => {
  try {
    const query = { waveOffAmount: { $gt: 0 } };

    // Extract propertyId from data
    const { propertyId } = data || {};

    if (propertyId) {
      query["property.id"] = propertyId;
    }

    const waveOffedPayments = await Payments.find(query).lean();

    const totalWaveOff = waveOffedPayments.reduce(
      (sum, payment) => sum + (payment.waveOffAmount || 0),
      0
    );

    return {
      success: true,
      status: 200,
      message: "Wave-offed payments fetched successfully",
      data: {
        payments: waveOffedPayments,
        totalWaveOff,
      },
    };
  } catch (error) {
    console.error("Service Error - getWaveOffedPayments:", error);
    return {
      success: false,
      status: 500,
      message: "Internal server error",
      error: error.message,
    };
  }
};

export const getAllCashPayments = async ({ propertyId }) => {
  try {
    const startDate = new Date("2025-10-13T00:00:00.000Z");

    // Fetch all cash payments
    const CashPayments = await Payments.find({
      paymentMethod: "Cash",
      createdAt: { $gte: startDate },
      ...(propertyId && { "property.id": propertyId }),
    }).sort({ createdAt: -1 });

    // Fetch all deposit cash payments
    const DepositPayments = await Deposits.find({
      paymentMethod: "Cash",
      createdAt: { $gte: startDate },
      ...(propertyId && { property: propertyId }),
    }).sort({ createdAt: -1 });

    // Fetch all cash expenses from Expense collection
    const Expenses = await Expense.find({
      paymentMethod: "Cash",
      createdAt: { $gte: startDate },
      ...(propertyId && { "property.id": propertyId }),
    }).sort({ createdAt: -1 });

    // Fetch all cash commissions
    const Commissions = await Commission.find({
      paymentType: "Cash",
      createdAt: { $gte: startDate },
      ...(propertyId && { property: propertyId }),
    }).sort({ createdAt: -1 });

    // Fetch all cash staff salary payments
    const StaffSalaries = await StaffSalaryHistory.find({
      paymentMethod: "Cash",
      createdAt: { $gte: startDate },
      ...(propertyId && { propertyId }),
    }).sort({ createdAt: -1 });

    // Calculate total cash payments (inflow)
    const totalCashPayments = CashPayments.reduce(
      (sum, payment) => sum + (payment.amount || 0),
      0
    );

    // Calculate total cash payments (inflow)
    const totalDepositPayments = DepositPayments.reduce(
      (sum, payment) => sum + (payment.amountPaid || 0),
      0
    );
    // Calculate total expenses (outflows)
    const totalExpenses = Expenses.reduce(
      (sum, exp) => sum + (exp.amount || 0),
      0
    );

    const totalCommissions = Commissions.reduce(
      (sum, com) => sum + (com.amount || 0),
      0
    );

    const totalStaffSalaries = StaffSalaries.reduce(
      (sum, sal) => sum + (sal.paidAmount || 0),
      0
    );

    // Total cash inflow
    const totalCashInflow = totalCashPayments + totalDepositPayments;

    // Total cash outflow
    const totalCashOutflow =
      totalExpenses + totalCommissions + totalStaffSalaries;

    // Net cash = inflow - outflow
    const netCash = Math.max(totalCashInflow - totalCashOutflow, 0);

    return {
      success: true,
      status: 200,
      message: "Cash payments fetched successfully",
      totalCashPayments,
      totalExpenses,
      totalCommissions,
      totalStaffSalaries,
      totalCashOutflow,
      netCash,
    };
  } catch (error) {
    console.error("Get Cash Payments Service Error:", error);
    return {
      success: false,
      status: 500,
      message: "Internal server error",
      error: error.message,
    };
  }
};

export const getLatestFeePaymentByUserId = async (data) => {
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

    const latestPayment = await Payments.findOne({ userId })
      .sort({ createdAt: -1 })
      .lean();

    if (!latestPayment) {
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
      message: "Latest payment fetched successfully",
      data: latestPayment,
    };
  } catch (error) {
    console.error("Error in getLatestFeePaymentByUserId:", error);
    return {
      success: false,
      status: 500,
      message: "Internal server error while fetching latest payment",
      error: error.message,
    };
  }
};

export const getFeePaymentsAnalytics = async (data) => {
  try {
    const { propertyId, rentType, year } = data;

    // Default to current year if not provided
    const targetYear = year || new Date().getFullYear();

    // Build match conditions
    const match = {
      paymentDate: {
        $gte: new Date(targetYear, 0, 1), // Jan 1st
        $lte: new Date(targetYear, 11, 31, 23, 59, 59, 999), // Dec 31st
      },
    };

    if (propertyId) {
      match["property.id"] = new mongoose.Types.ObjectId(propertyId);
    }

    if (rentType) {
      match.rentType = rentType.trim();
    }

    // Aggregate payments by month
    const analytics = await Payments.aggregate([
      { $match: match },
      {
        $group: {
          _id: { month: { $month: "$paymentDate" } },
          totalReceived: { $sum: "$amount" },
        },
      },
      { $sort: { "_id.month": 1 } },
    ]);

    // Format output: ["January 2025", "February 2025", ...]
    const formatted = analytics.map((monthData) => {
      const monthName = new Date(0, monthData._id.month - 1).toLocaleString(
        "en",
        {
          month: "long",
        }
      );

      return {
        monthYear: `${monthName} ${targetYear}`,
        totalReceived: monthData.totalReceived,
      };
    });

    return {
      success: true,
      year: targetYear,
      data: formatted,
    };
  } catch (error) {
    console.error("[ANALYTICS] Error:", error);
    return {
      success: false,
      message: "Failed to fetch payment analytics",
      error: error.message,
    };
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

    const payments = await Payments.find({ userId }).lean();

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
