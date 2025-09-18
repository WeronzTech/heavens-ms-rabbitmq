import { getPropertyById, getUserById } from "./internal.service.js";
import Payments from "../models/feePayments.model.js";

export const addFeePayment = async (data) => {
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
    } = data;

    // ✅ Validate User
    const user = await getUserById(userId);
    if (!user || user?.success === false) {
      return {
        success: false,
        status: 400,
        message: "Invalid user. User does not exist.",
      };
    }

    // ✅ Validate Property if provided
    let propertyData = null;
    if (property?.id) {
      const prop = await getPropertyById(property.id);
      if (!prop || prop?.success === false) {
        return {
          success: false,
          status: 400,
          message: "Invalid property. Property does not exist.",
        };
      }
      propertyData = {
        id: property.id,
        name: prop?.data?.propertyName || property.name,
      };
    }

    // ✅ Save Payment
    const payment = new Payments({
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
      property: propertyData || {},
      receiptNumber,
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      clientId,
      userId,
    });

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