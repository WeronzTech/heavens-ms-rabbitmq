import { getPropertyById, getUserById } from "./internal.service.js";
import Payments from "../models/feePayments.model.js";
import mongoose from "mongoose";
import { USER_PATTERN } from "../../../../libs/patterns/user/user.pattern.js";
import { sendRPCRequest } from "../../../../libs/common/rabbitMq.js";

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

export const getAllFeePayments = async () => {
  try {
    const payments = await Payments.find();

    return {
      success: true,
      status: 200,
      data: payments,
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
          fullyClearedRentMonths: { $first: "$fullyClearedRentMonths" }, // take from latest doc
        },
      },
      {
        $project: {
          userId: "$_id",
          paymentDate: 1,
          lastClearedMonth: {
            $arrayElemAt: ["$fullyClearedRentMonths", -1], // last element of array
          },
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
    console.log(data);
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
