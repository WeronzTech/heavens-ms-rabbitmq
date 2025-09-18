import { sendRPCRequest } from "../../../../../libs/common/rabbitMq.js";
import { ACCOUNTS_PATTERN } from "../../../../../libs/patterns/accounts/accounts.pattern.js";

export const addFeePaymentController = async (req, res) => {
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
        razrazorpaySignature,
        clientId,
        userId, } = req.body; // include optional file
  
      const response = await sendRPCRequest(
        ACCOUNTS_PATTERN.FEE_PAYMENTS.ADD_FEE_PAYMENTS, // ✅ new pattern
        { data: { name,
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
            razrazorpaySignature,
            clientId,
            userId, } }      // wrapped in data
      );
  
      return res.status(response?.status || 500).json(response);
    } catch (error) {
      console.error("RPC Add FEE PAYMENT Controller Error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  };