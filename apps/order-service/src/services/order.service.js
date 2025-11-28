import Order from "../models/orders.model.js";
import {
  createRazorpayOrderId,
  verifyPayment,
  razorpayRefund,
} from "../utils/razorpay.js"; // Assuming this path based on structure

export const createOrder = async ( data ) => {
  try {
    const {
      customer,
      merchant,
      items,
      bill,
      paymentMethod,
      deliveryAddress,
      instructions,
    } = data;
    console.log(data)
    if (!customer || !items || items.length === 0 || !bill) {
      return { status: 400, message: "Missing required order details." };
    }

    // 2. Create Order in "Pending" state
    const newOrder = await Order.create({
      customer,
      merchant,
      items,
      bill,
      paymentMethod,
      deliveryAddress,
      instructions,
      status: "Pending",
      paymentStatus: "Pending",
    });

    let razorpayOrderData = null;

    // 3. If Online Payment, initiate Razorpay Order
    if (paymentMethod === "Online") {
      const rzResult = await createRazorpayOrderId(bill.grandTotal, merchant);

      if (!rzResult.success) {
        // If payment init fails, we might want to delete the pending order or leave it as failed
        await Order.findByIdAndDelete(newOrder._id);
        return { status: 500, message: "Failed to initiate payment gateway." };
      }

      // Save the Razorpay Order ID (transactionId) to the order
      newOrder.transactionId = rzResult.orderId;
      await newOrder.save();

      razorpayOrderData = {
        id: rzResult.orderId,
        amount: bill.grandTotal * 100, // Amount in paise
        currency: "INR",
      };
    }

    return {
      status: 201,
      data: {
        message: "Order created successfully",
        order: newOrder,
        razorpayOrder: razorpayOrderData, // Send this to frontend
      },
    };
  } catch (error) {
    console.error("RPC Create Order Error:", error);
    return {
      status: 500,
      message: error.message || "Failed to create order",
    };
  }
};

export const verifyOrderPayment = async ({ data }) => {
  try {
    const { orderId, paymentDetails } = data;
    // paymentDetails should contain: razorpay_order_id, razorpay_payment_id, razorpay_signature
    const order = await Order.findById(orderId);

    if (!order) {
      return { status: 404, message: "Order not found" };
    }

    // 1. Verify Signature
    const isValid = await verifyPayment(paymentDetails, order.merchant);

    if (!isValid) {
      return { status: 400, message: "Payment verification failed" };
    }

    // 2. Update Order Status
    const updatedOrder = await Order.findByIdAndUpdate(
      orderId,
      {
        status: "Confirmed",
        paymentStatus: "Completed",
        paymentId: paymentDetails.razorpay_payment_id, // Save the actual Payment ID
      },
      { new: true }
    );

    if (!updatedOrder) {
      return { status: 404, message: "Order not found" };
    }

    return {
      status: 200,
      data: {
        message: "Payment verified and order confirmed",
        order: updatedOrder,
      },
    };
  } catch (error) {
    console.error("RPC Verify Payment Error:", error);
    return { status: 500, message: error.message };
  }
};

export const updateOrderStatus = async ( data ) => {
  try {
    const { orderId, status, cancellationReason } = data;

    const validStatuses = [
      "Pending",
      "Confirmed",
      // "Preparing"
      "Out for Delivery",
      "Completed",
      "Cancelled",
    ];

    if (!validStatuses.includes(status)) {
      return { status: 400, message: "Invalid status provided" };
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return { status: 404, message: "Order not found" };
    }

    // --- CANCELLATION LOGIC ---
    if (status === "Cancelled") {
      // Check if refund is needed
      if (order.paymentStatus === "Completed" && order.paymentId) {
        const refundResult = await razorpayRefund(
          order.paymentId,
          order.bill.grandTotal,
          order.merchant
        );

        if (refundResult.success) {
          order.paymentStatus = "Refunded";
          order.refundId = refundResult.refundId;
        } else {
          // Log error but maybe still cancel the order manually or throw error?
          // For now, we proceed but log the failure
          console.error(
            "Refund failed for order:",
            orderId,
            refundResult.error
          );
          // Optional: Return error and don't cancel?
          // return { status: 500, message: "Refund failed: " + refundResult.error };
        }
      }
      order.cancellationReason = cancellationReason || "Cancelled by admin";
    }

    order.status = status;
    await order.save();

    return {
      status: 200,
      data: { message: `Order status updated to ${status}`, order },
    };
  } catch (error) {
    console.error("RPC Update Order Status Error:", error);
    return { status: 500, message: error.message };
  }
};

export const getOrderById = async ({ data }) => {
  try {
    const { orderId } = data;
    const order = await Order.findById(orderId)
      .populate("merchant", "merchantDetail.merchantName") // Adjust based on your Merchant Model structure
      .populate("items.productId", "productName productImageURL");

    if (!order) {
      return { status: 404, message: "Order not found" };
    }

    return { status: 200, data: { order } };
  } catch (error) {
    return { status: 500, message: error.message };
  }
};

export const getOrdersByCustomer = async ( data ) => {
  try {
    const { customerId, page = 1, limit = 10 } = data;
    const orders = await Order.find({ customer: customerId })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    return { status: 200, data: { orders } };
  } catch (error) {
    return { status: 500, message: error.message };
  }
};

export const getOrdersByMerchant = async ( data ) => {
  try {
    const { merchantId, page = 1, limit = 10, status } = data;
    // console.log("Daataa:::",data)
    const query = { merchant: merchantId };
    if (status) query.status = status;

    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    return { status: 200, data: { orders } };
  } catch (error) {
    return { status: 500, message: error.message };
  }
};
