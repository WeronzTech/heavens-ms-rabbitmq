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
import Voucher from "../models/voucher.model.js";

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

// const processAndRecordPayment = async ({
//   userId,
//   amount,
//   paymentMethod,
//   transactionId = null,
//   razorpayDetails = {},
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

//     // --- Financial Logic ---
//     if (user.rentType === "daily" || user.rentType === "mess") {
//       const pending = user.financialDetails.pendingAmount || 0;
//       if (amount < pending) {
//         throw new Error(
//           `Payment amount must be at least the pending amount of ₹${pending}.`
//         );
//       }
//       user.financialDetails.pendingAmount -= amount;
//       if (user.financialDetails.pendingAmount <= 0) {
//         user.paymentStatus = "paid";
//       }
//     } else if (user.rentType === "monthly") {
//       const monthlyRent = user.financialDetails.monthlyRent || 0;
//       const currentBalance = user.financialDetails.accountBalance || 0;
//       const totalAvailableAmount = amount + currentBalance;

//       if (monthlyRent <= 0) throw new Error("Monthly rent is not set.");
//       if (totalAvailableAmount < monthlyRent) {
//         throw new Error(
//           `Payment of ₹${amount} plus advance of ₹${currentBalance} is less than monthly rent of ₹${monthlyRent}.`
//         );
//       }

//       let monthsCleared = Math.floor(totalAvailableAmount / monthlyRent);
//       let newAccountBalance = totalAvailableAmount % monthlyRent;

//       user.financialDetails.accountBalance = newAccountBalance;
//       user.financialDetails.pendingRent =
//         (user.financialDetails.pendingRent || 0) - monthsCleared * monthlyRent;
//       if (user.financialDetails.pendingRent <= 0) {
//         user.financialDetails.pendingRent = 0;
//         user.paymentStatus = "paid";
//       }

//       const lastCleared = user.financialDetails.clearedTillMonth
//         ? new Date(`${user.financialDetails.clearedTillMonth}-01`)
//         : new Date(user.stayDetails.joinDate);
//       lastCleared.setMonth(lastCleared.getMonth() + monthsCleared);
//       user.financialDetails.clearedTillMonth = `${lastCleared.getFullYear()}-${String(
//         lastCleared.getMonth() + 1
//       ).padStart(2, "0")}`;
//       user.financialDetails.nextDueDate = new Date(
//         lastCleared.getFullYear(),
//         lastCleared.getMonth() + 1,
//         5
//       );
//     }

//     // Create the Payment Record
//     const newPayment = new Payments({
//       name: user.name,
//       contact: user.contact,
//       room: user.stayDetails?.roomNumber || "N/A",
//       rent: user.financialDetails?.monthlyRent || 0,
//       amount: amount,
//       accountBalance: user.financialDetails?.accountBalance || 0,
//       dueAmount: user.financialDetails.pendingRent,
//       paymentMethod,
//       transactionId,
//       status: "Paid",
//       property: {
//         id: user.stayDetails?.propertyId,
//         name: user.stayDetails?.propertyName,
//       },
//       userId: user._id,
//       ...razorpayDetails,
//     });

//     await newPayment.save();

//     // Update user via RPC
//     const updateUserResponse = await sendRPCRequest(
//       USER_PATTERN.USER.UPDATE_USER,
//       {
//         userId,
//         userData: {
//           financialDetails: user.financialDetails,
//           paymentStatus: user.paymentStatus,
//         },
//       }
//     );

//     if (!updateUserResponse.body.success) {
//       throw new Error("Failed to update user financial details.");
//     }

//     await session.commitTransaction();
//     return {
//       success: true,
//       status: 201,
//       message: "Payment recorded successfully.",
//       data: newPayment,
//     };
//   } catch (error) {
//     await session.abortTransaction();
//     console.error("Error during payment processing:", error);
//     return { success: false, status: 400, message: error.message };
//   } finally {
//     session.endSession();
//   }
// };

// export const initiateOnlinePayment = async (data) => {
//   try {
//     const { userId, amount } = data;
//     if (!userId || !amount || Number(amount) <= 0) {
//       return {
//         success: false,
//         status: 400,
//         message: "Valid User ID and amount are required.",
//       };
//     }

//     const userResponse = await sendRPCRequest(
//       USER_PATTERN.USER.GET_USER_BY_ID,
//       { userId }
//     );
//     console.log("User", userResponse);
//     if (!userResponse.body.success) {
//       return { success: false, status: 404, message: "User not found." };
//     }
//     const user = userResponse.body.data;
//     const razorpayResponse = await createRazorpayOrderId(amount);
//     if (!razorpayResponse.success) {
//       return {
//         success: false,
//         status: 500,
//         message: "Failed to create payment order.",
//       };
//     }

//     return {
//       success: true,
//       status: 200,
//       message: "Order created successfully.",
//       data: {
//         orderId: razorpayResponse.orderId,
//         amount: Number(amount),
//         name: "Heavens Living",
//         prefill: { name: user.name, email: user.email, contact: user.contact },
//       },
//     };
//   } catch (error) {
//     return { success: false, status: 500, message: "Internal Server Error" };
//   }
// };

// export const verifyAndRecordOnlinePayment = async (data) => {
//   const {
//     razorpay_order_id,
//     razorpay_payment_id,
//     razorpay_signature,
//     userId,
//     amount,
//   } = data;

//   const isVerified = await verifyRazorpaySignature({
//     razorpay_order_id,
//     razorpay_payment_id,
//     razorpay_signature,
//   });
//   if (!isVerified) {
//     return {
//       success: false,
//       status: 400,
//       message: "Payment verification failed. Invalid signature.",
//     };
//   }

//   return await processAndRecordPayment({
//     userId,
//     amount: Number(amount),
//     paymentMethod: "Razorpay",
//     razorpayDetails: {
//       razorpayOrderId: razorpay_order_id,
//       razorpayPaymentId: razorpay_payment_id,
//       razorpaySignature: razorpay_signature,
//     },
//     transactionId: razorpay_payment_id,
//   });
// };

// export const recordManualPayment = async (data) => {
//   const { userId, amount, paymentMethod, transactionId } = data;
//   if (!["Cash", "UPI", "Bank Transfer"].includes(paymentMethod)) {
//     return {
//       success: false,
//       status: 400,
//       message: "Invalid manual payment method.",
//     };
//   }
//   if (paymentMethod !== "Cash" && !transactionId) {
//     return {
//       success: false,
//       status: 400,
//       message: "Transaction ID is required for UPI/Bank Transfer.",
//     };
//   }

//   return await processAndRecordPayment({
//     userId,
//     amount: Number(amount),
//     paymentMethod,
//     transactionId,
//   });
// };
// const processAndRecordPayment = async ({
//   userId,
//   amount,
//   paymentMethod,
//   transactionId = null,
//   razorpayDetails = {},
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

//     // --- Financial Logic ---
//     if (user.rentType === "daily" || user.rentType === "mess") {
//       const pending = user.financialDetails.pendingAmount || 0;
//       if (amount < pending) {
//         throw new Error(
//           `Payment amount must be at least the pending amount of ₹${pending}.`
//         );
//       }
//       user.financialDetails.pendingAmount -= amount;
//       if (user.financialDetails.pendingAmount <= 0) {
//         user.paymentStatus = "paid";
//       }
//     } else if (user.rentType === "monthly") {
//       const monthlyRent = user.financialDetails.monthlyRent || 0;
//       const currentBalance = user.financialDetails.accountBalance || 0;
//       const currentPendingRent = user.financialDetails.pendingRent || 0;
//       const totalAvailableAmount = amount + currentBalance;

//       if (monthlyRent <= 0) throw new Error("Monthly rent is not set.");

//       // ✅ MODIFIED: Only enforce minimum payment if there are outstanding dues
//       if (currentPendingRent > 0 && totalAvailableAmount < monthlyRent) {
//         throw new Error(
//           `To clear your due, payment of ₹${amount} plus advance of ₹${currentBalance} must be at least the monthly rent of ₹${monthlyRent}.`
//         );
//       }

//       let monthsCleared = Math.floor(totalAvailableAmount / monthlyRent);
//       let newAccountBalance = totalAvailableAmount % monthlyRent;

//       user.financialDetails.accountBalance = newAccountBalance;
//       // Use currentPendingRent for calculation to avoid issues with null values
//       user.financialDetails.pendingRent =
//         currentPendingRent - monthsCleared * monthlyRent;
//       if (user.financialDetails.pendingRent <= 0) {
//         user.financialDetails.pendingRent = 0;
//         user.paymentStatus = "paid";
//       }

//       // Only update cleared month if at least one month is cleared
//       if (monthsCleared > 0) {
//         const lastCleared = user.financialDetails.clearedTillMonth
//           ? new Date(`${user.financialDetails.clearedTillMonth}-01`)
//           : new Date(user.stayDetails.joinDate);
//         lastCleared.setMonth(lastCleared.getMonth() + monthsCleared);
//         user.financialDetails.clearedTillMonth = `${lastCleared.getFullYear()}-${String(
//           lastCleared.getMonth() + 1
//         ).padStart(2, "0")}`;
//         user.financialDetails.nextDueDate = new Date(
//           lastCleared.getFullYear(),
//           lastCleared.getMonth() + 1,
//           5
//         );
//       }
//     }

//     // Create the Payment Record
//     const newPayment = new Payments({
//       name: user.name,
//       contact: user.contact,
//       room: user.stayDetails?.roomNumber || "N/A",
//       rent: user.financialDetails?.monthlyRent || 0,
//       amount: amount,
//       accountBalance: user.financialDetails?.accountBalance || 0,
//       dueAmount: user.financialDetails.pendingRent,
//       paymentMethod,
//       transactionId,
//       status: "Paid",
//       property: {
//         id: user.stayDetails?.propertyId,
//         name: user.stayDetails?.propertyName,
//       },
//       userId: user._id,
//       ...razorpayDetails,
//     });

//     await newPayment.save({ session });

//     // Update user via RPC
//     const updateUserResponse = await sendRPCRequest(
//       USER_PATTERN.USER.UPDATE_USER,
//       {
//         userId,
//         userData: {
//           financialDetails: user.financialDetails,
//           paymentStatus: user.paymentStatus,
//         },
//       }
//     );

//     if (!updateUserResponse.body.success) {
//       throw new Error("Failed to update user financial details.");
//     }

//     await session.commitTransaction();
//     return {
//       success: true,
//       status: 201,
//       message: "Payment recorded successfully.",
//       data: newPayment,
//     };
//   } catch (error) {
//     await session.abortTransaction();
//     console.error("Error during payment processing:", error);
//     return { success: false, status: 400, message: error.message };
//   } finally {
//     session.endSession();
//   }
// };
// const processAndRecordPayment = async ({
//   userId,
//   amount,
//   paymentMethod,
//   transactionId = null,
//   razorpayDetails = {},
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

//     let paymentForMonths = []; // Initialize for all types

//     // --- Logic for Daily and Mess users ---
//     if (user.rentType === "daily" || user.rentType === "mess") {
//       const pending = user.financialDetails.pendingAmount || 0;
//       if (amount < pending) {
//         throw new Error(
//           `Payment amount must be at least the pending amount of ₹${pending}.`
//         );
//       }
//       user.financialDetails.pendingAmount -= amount;
//       if (user.financialDetails.pendingAmount <= 0) {
//         user.paymentStatus = "paid";
//       }
//     }
//     // --- Logic for Monthly Renters ---
//     else if (user.rentType === "monthly") {
//       const monthlyRent = user.financialDetails.monthlyRent || 0;
//       const currentBalance = user.financialDetails.accountBalance || 0;
//       const currentPendingRent = user.financialDetails.pendingRent || 0;
//       const totalAvailableAmount = amount + currentBalance;
//       console.log("Total", totalAvailableAmount);

//       if (monthlyRent <= 0) throw new Error("Monthly rent is not set.");

//       if (currentPendingRent > 0 && totalAvailableAmount < monthlyRent) {
//         throw new Error(
//           `To clear your due, payment of ₹${amount} plus advance of ₹${currentBalance} must be at least the monthly rent of ₹${monthlyRent}.`
//         );
//       }

//       let monthsCleared = Math.floor(totalAvailableAmount / monthlyRent);
//       let newAccountBalance = totalAvailableAmount % monthlyRent;

//       user.financialDetails.accountBalance = newAccountBalance;
//       user.financialDetails.pendingRent =
//         currentPendingRent - monthsCleared * monthlyRent;
//       if (user.financialDetails.pendingRent <= 0) {
//         user.financialDetails.pendingRent = 0;
//         user.paymentStatus = "paid";
//       }
//       console.log("Months cleared", monthsCleared);

//       if (monthsCleared > 0) {
//         const lastClearedDate = user.financialDetails.clearedTillMonth
//           ? new Date(`${user.financialDetails.clearedTillMonth}-01`)
//           : new Date(user.stayDetails.joinDate);

//         if (!user.financialDetails.clearedTillMonth) {
//           lastClearedDate.setMonth(lastClearedDate.getMonth() - 1);
//         }

//         // This loop determines which months are being paid for
//         for (let i = 0; i < monthsCleared; i++) {
//           const paymentMonthDate = new Date(lastClearedDate);
//           paymentMonthDate.setMonth(paymentMonthDate.getMonth() + i + 1);
//           paymentForMonths.push(
//             // The result is added here
//             paymentMonthDate.toLocaleString("default", {
//               month: "long",
//               year: "numeric",
//             })
//           );
//         }
//         console.log("payment for month", paymentForMonths);

//         const finalClearedDate = new Date(lastClearedDate);
//         finalClearedDate.setMonth(finalClearedDate.getMonth() + monthsCleared);

//         user.financialDetails.clearedTillMonth = `${finalClearedDate.getFullYear()}-${String(
//           finalClearedDate.getMonth() + 1
//         ).padStart(2, "0")}`;
//         user.financialDetails.nextDueDate = new Date(
//           finalClearedDate.getFullYear(),
//           finalClearedDate.getMonth() + 1,
//           5
//         );
//       }
//     }

//     // Create the Payment Record
//     const newPayment = new Payments({
//       name: user.name,
//       contact: user.contact,
//       room: user.stayDetails?.roomNumber || "N/A",
//       rent: user.financialDetails?.monthlyRent || 0,
//       amount: amount,
//       accountBalance: user.financialDetails?.accountBalance || 0,
//       dueAmount: user.financialDetails.pendingRent,
//       paymentMethod,
//       transactionId,
//       paymentForMonths,
//       status: "Paid",
//       property: {
//         id: user.stayDetails?.propertyId,
//         name: user.stayDetails?.propertyName,
//       },
//       userId: user._id,
//       ...razorpayDetails,
//     });

//     await newPayment.save();

//     // Update user via RPC
//     const updateUserResponse = await sendRPCRequest(
//       USER_PATTERN.USER.UPDATE_USER,
//       {
//         userId,
//         userData: {
//           financialDetails: user.financialDetails,
//           paymentStatus: user.paymentStatus,
//         },
//       }
//     );

//     if (!updateUserResponse.body.success) {
//       throw new Error("Failed to update user financial details.");
//     }

//     await session.commitTransaction();
//     return {
//       success: true,
//       status: 201,
//       message: "Payment recorded successfully.",
//       data: newPayment,
//     };
//   } catch (error) {
//     await session.abortTransaction();
//     console.error("Error during payment processing:", error);
//     return { success: false, status: 400, message: error.message };
//   } finally {
//     session.endSession();
//   }
// };
const processAndRecordPayment = async ({
  userId,
  amount,
  paymentMethod,
  transactionId = null,
  razorpayDetails = {},
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

    let paymentForMonths = []; // Initialize for all types

    // --- Logic for Daily and Mess users ---
    if (user.rentType === "daily" || user.rentType === "mess") {
      const pending = user.financialDetails.pendingAmount || 0;
      if (amount < pending) {
        throw new Error(
          `Payment amount must be at least the pending amount of ₹${pending}.`
        );
      }
      user.financialDetails.pendingAmount -= amount;
      if (user.financialDetails.pendingAmount <= 0) {
        user.paymentStatus = "paid";
      }
    }
    // --- Logic for Monthly Renters ---
    else if (user.rentType === "monthly") {
      const monthlyRent = user.financialDetails.monthlyRent || 0;
      if (monthlyRent <= 0) throw new Error("Monthly rent is not set.");

      // ✅ **NEW LOGIC: Dynamically calculate and add overdue rent**
      const { clearedTillMonth } = user.financialDetails;
      if (clearedTillMonth) {
        const today = moment();
        const nextDueDate = moment(clearedTillMonth, "YYYY-MM").add(
          1,
          "months"
        );

        console.log("Before", user.financialDetails.pendingRent);
        if (today.isAfter(nextDueDate)) {
          const monthsOverdue = today.diff(nextDueDate, "months") + 1;
          const overdueRent = monthsOverdue * monthlyRent;
          console.log("Overdue rent:", overdueRent);
          // Add the newly calculated overdue amount to any existing pending rent
          user.financialDetails.pendingRent = overdueRent;
          console.log("After", user.financialDetails.pendingRent);
        }
      }
      // **END OF NEW LOGIC**

      const currentBalance = user.financialDetails.accountBalance || 0;
      const currentPendingRent = user.financialDetails.pendingRent || 0;
      const totalAvailableAmount = amount + currentBalance;

      if (currentPendingRent > 0 && totalAvailableAmount < monthlyRent) {
        throw new Error(
          `To clear your due, payment of ₹${amount} plus advance of ₹${currentBalance} must be at least the monthly rent of ₹${monthlyRent}.`
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
      }
    }

    // Create the Payment Record
    const newPayment = new Payments({
      name: user.name,
      contact: user.contact,
      room: user.stayDetails?.roomNumber || "N/A",
      rent: user.financialDetails?.monthlyRent || 0,
      amount: amount,
      accountBalance: user.financialDetails?.accountBalance || 0,
      dueAmount: user.financialDetails.pendingRent,
      paymentMethod,
      transactionId,
      paymentForMonths,
      status: "Paid",
      property: {
        id: user.stayDetails?.propertyId,
        name: user.stayDetails?.propertyName,
      },
      userId: user._id,
      ...razorpayDetails,
    });

    await newPayment.save({ session });

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
  const { userId, amount, paymentMethod, transactionId } = data;
  if (!["Cash", "UPI", "Bank Transfer"].includes(paymentMethod)) {
    return {
      success: false,
      status: 400,
      message: "Invalid manual payment method.",
    };
  }
  if (paymentMethod !== "Cash" && !transactionId) {
    return {
      success: false,
      status: 400,
      message: "Transaction ID is required for UPI/Bank Transfer.",
    };
  }

  return await processAndRecordPayment({
    userId,
    amount: Number(amount),
    paymentMethod,
    transactionId,
  });
};

export const getAllFeePayments = async (data) => {
  try {
    const { propertyId, rentType, page = 1, limit = 10 } = data;

    const filter = {};
    if (propertyId) {
      filter["property.id"] = propertyId;
    }
    if (rentType) {
      filter.rentType = rentType.trim();
    }

    // Fields to select
    const projection =
      "name rent paymentMethod transactionId paymentDate amount";

    // Query with pagination
    const payments = await Payments.find(filter, projection)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    // Get total count for pagination metadata
    const total = await Payments.countDocuments(filter);

    return {
      success: true,
      status: 200,
      data: payments,
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
    const commissions = await Commission.find(filter).sort({ createdAt: -1 }).lean();

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
      message: "An internal server error occurred while fetching all accounts summary.",
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
    // Fetch all cash payments
    const CashPayments = await Payments.find({
      paymentMethod: "Cash",
      ...(propertyId && { "property.id": propertyId }), // Payments model uses property.id
    }).sort({ createdAt: -1 });

    // Fetch all vouchers (filtering by propertyId from voucher model)
    const Vouchers = await Voucher.find({
      ...(propertyId && { propertyId }),
    }).sort({ createdAt: -1 });

    // Calculate total cash payments
    const totalCashPayments = CashPayments.reduce(
      (sum, payment) => sum + (payment.amount || 0),
      0
    );

    // Calculate total vouchers
    const totalVouchers = Vouchers.reduce(
      (sum, voucher) => sum + (voucher.amount || 0),
      0
    );

    // Net cash = cash payments - vouchers
    const netCash = totalCashPayments - totalVouchers;

    return {
      success: true,
      status: 200,
      message: "Cash payments fetched successfully",
      totalCashPayments,
      totalVouchers,
      netCash,
      // cashPayments: CashPayments,
      // vouchers: Vouchers,
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