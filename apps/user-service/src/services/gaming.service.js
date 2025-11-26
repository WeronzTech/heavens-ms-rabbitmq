import {
  deleteFromFirebase,
  uploadToFirebase,
} from "../../../../libs/common/imageOperation.js";
import {
  createRazorpayOrderId,
  verifyPayment,
} from "../../../../libs/common/razorpay.js";
import { PROPERTY_PATTERN } from "../../../../libs/patterns/property/property.pattern.js";
import GamingItem from "../models/gamingItem.model.js";
import GamingOrder from "../models/gamingOrder.model.js";
import User from "../models/user.model.js";

const getRazorpayCredentialsForUser = async (userId) => {
  try {
    if (!userId) return { keyId: null, keySecret: null };

    // 1. Get User to find Property ID
    // Since we are inside user-service, we can directly query the User model
    // instead of making an RPC call to itself.
    const user = await User.findById(userId).select("stayDetails");

    if (user && user.stayDetails?.propertyId) {
      const propertyId = user.stayDetails.propertyId;

      // 2. Get Property via RPC to find Credentials
      const propertyResponse = await sendRPCRequest(
        PROPERTY_PATTERN.PROPERTY.GET_PROPERTY_BY_ID,
        { id: propertyId }
      );

      if (
        propertyResponse.success &&
        propertyResponse.data?.razorpayCredentials?.keyId &&
        propertyResponse.data?.razorpayCredentials?.keySecret
      ) {
        return {
          keyId: propertyResponse.data.razorpayCredentials.keyId,
          keySecret: propertyResponse.data.razorpayCredentials.keySecret,
        };
      }
    }
  } catch (error) {
    console.error(
      "Error fetching Razorpay credentials for gaming order:",
      error
    );
  }
  // Return nulls to fallback to env vars in razorpay utils
  return { keyId: null, keySecret: null };
};

export const createGamingItem = async (data) => {
  try {
    if (!data.itemImage) {
      return {
        success: false,
        status: 400,
        message: "Item image is required.",
      };
    }

    // Create a file object that uploadToFirebase can use
    const file = {
      buffer: Buffer.from(data.itemImage.buffer, "base64"),
      originalname: data.itemImage.originalname,
    };

    const itemImageURL = await uploadToFirebase(file, "gaming-images");

    const newItem = await GamingItem.create({
      itemName: data.itemName,
      price: data.price,
      itemImage: itemImageURL,
    });
    return { success: true, status: 201, data: newItem };
  } catch (error) {
    console.error("Create Gaming Item Service Error:", error);
    return { success: false, status: 500, message: "Internal server error" };
  }
};

export const getAllGamingItems = async () => {
  try {
    const items = await GamingItem.find();
    return { success: true, status: 200, data: items };
  } catch (error) {
    console.error("Get All Gaming Items Service Error:", error);
    return { success: false, status: 500, message: "Internal server error" };
  }
};

export const getGamingItemById = async ({ itemId }) => {
  try {
    const item = await GamingItem.findById(itemId);
    if (!item) {
      return { success: false, status: 404, message: "Gaming item not found" };
    }
    return { success: true, status: 200, data: item };
  } catch (error) {
    console.error("Get Gaming Item By ID Service Error:", error);
    return { success: false, status: 500, message: "Internal server error" };
  }
};

export const updateGamingItem = async (data) => {
  try {
    const { itemId, itemImage, ...updateData } = data;
    const oldGamingItem = await GamingItem.findById(itemId);

    // ✅ FIX: Only process image if it exists and has buffer data
    if (itemImage && itemImage.buffer) {
      // Create a file object that uploadToFirebase can use
      const file = {
        buffer: Buffer.from(itemImage.buffer, "base64"),
        originalname: itemImage.originalname,
      };

      const itemImageURL = await uploadToFirebase(file, "gaming-images");
      updateData.itemImage = itemImageURL;
      await deleteFromFirebase(oldGamingItem.itemImage);
    }
    // ✅ If no new image is provided, the existing image remains unchanged

    const updatedItem = await GamingItem.findByIdAndUpdate(itemId, updateData, {
      new: true,
    });

    if (!updatedItem) {
      return { success: false, status: 404, message: "Gaming item not found" };
    }

    return { success: true, status: 200, data: updatedItem };
  } catch (error) {
    console.error("Update Gaming Item Service Error:", error);
    return { success: false, status: 500, message: "Internal server error" };
  }
};

export const updateGamingItemStatus = async ({ itemId, status }) => {
  try {
    const updatedItem = await GamingItem.findByIdAndUpdate(
      itemId,
      { status },
      { new: true }
    );
    if (!updatedItem) {
      return { success: false, status: 404, message: "Gaming item not found" };
    }
    return { success: true, status: 200, data: updatedItem };
  } catch (error) {
    console.error("Update Gaming Item Status Service Error:", error);
    return { success: false, status: 500, message: "Internal server error" };
  }
};

export const deleteGamingItem = async ({ itemId }) => {
  try {
    const deleted = await GamingItem.findByIdAndDelete(itemId);
    if (!deleted) {
      return { success: false, status: 404, message: "Gaming item not found" };
    }
    await deleteFromFirebase(deleted.itemImage);
    return {
      success: true,
      status: 200,
      message: "Gaming item deleted successfully",
    };
  } catch (error) {
    console.error("Delete Gaming Item Service Error:", error);
    return { success: false, status: 500, message: "Internal server error" };
  }
};

// --- REFACTORED GAMING ORDER & PAYMENT SERVICES ---

/**
 * Step 1: Initiates an order.
 * Creates a Razorpay order and a 'Pending' order in our DB.
 */
export const initiateGamingOrder = async ({
  itemId,
  discountPrice = 0,
  userId,
}) => {
  try {
    const item = await GamingItem.findById(itemId);
    if (!item) {
      return { success: false, status: 404, message: "Gaming item not found" };
    }
    if (item.status === "OutOfStock") {
      return { success: false, status: 400, message: "Item is out of stock" };
    }

    const finalPrice = item.price - discountPrice;
    if (finalPrice < 0) {
      return {
        success: false,
        status: 400,
        message: "Discount cannot be greater than the item price",
      };
    }

    const { keyId, keySecret } = await getRazorpayCredentialsForUser(userId);

    // Create the payment order with Razorpay/mock service
    const paymentResponse = await createRazorpayOrderId(
      finalPrice,
      keyId,
      keySecret
    );
    if (!paymentResponse.success) {
      return {
        success: false,
        status: 500,
        message: "Failed to create payment order.",
      };
    }
    const { orderId: razorpayOrderId } = paymentResponse;

    // Create a preliminary order in our database
    const newOrder = await GamingOrder.create({
      itemId,
      userId,
      originalPrice: item.price,
      discountApplied: discountPrice,
      finalPrice,
      paymentStatus: "Pending",
      paymentDetails: {
        orderId: razorpayOrderId,
      },
    });

    // Return the razorpayOrderId to the client to open the payment modal
    return {
      success: true,
      status: 201,
      message: "Gaming order initiated successfully.",
      data: {
        ...newOrder.toObject(),
        // --- UPDATE START: Return correct Key ID for frontend ---
        keyId: keyId || process.env.RAZORPAY_KEY_ID,
        // --- UPDATE END ---
      },
    };
  } catch (error) {
    console.error("Initiate Gaming Order Service Error:", error);
    return { success: false, status: 500, message: "Internal server error" };
  }
};

/**
 * Step 2: Verifies the payment and confirms the order.
 * Updates the order status from 'Pending' to 'Success'.
 */
export const verifyPaymentAndConfirmOrder = async (data) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = data;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return {
        success: false,
        status: 400,
        message: "Missing payment verification details.",
      };
    }

    const order = await GamingOrder.findOne({
      "paymentDetails.orderId": razorpay_order_id,
    });
    if (!order) {
      return {
        success: false,
        status: 404,
        message: "No pending order found with the given order ID.",
      };
    }

    const { keySecret } = await getRazorpayCredentialsForUser(order.userId);
    // Verify the payment signature
    const isPaymentValid = await verifyPayment(
      {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
      },
      keySecret
    );

    if (!isPaymentValid) {
      // If payment fails, delete the preliminary order to prevent clutter
      await GamingOrder.findByIdAndDelete(order._id);
      return {
        success: false,
        status: 400,
        message: "Payment verification failed. Invalid signature.",
      };
    }

    // If payment is successful, update the order
    order.paymentStatus = "Success";
    order.paymentDetails.paymentId = razorpay_payment_id;
    order.paymentDetails.signature = razorpay_signature;
    await order.save();

    // Here you can trigger notifications, etc.
    if (order.userId) {
      await User.findByIdAndUpdate(order.userId, {
        "gaming.gameCompleted": true,
      });
    }

    return {
      success: true,
      status: 200,
      message: "Payment verified and order confirmed successfully.",
      data: order,
    };
  } catch (error) {
    console.error("Verify Payment and Confirm Order Service Error:", error);
    return { success: false, status: 500, message: "Internal server error" };
  }
};

// --- Other Order Management ---
export const updateOrderStatus = async ({ orderId, deliveryStatus }) => {
  try {
    const updatedOrder = await GamingOrder.findByIdAndUpdate(
      orderId,
      { deliveryStatus },
      { new: true }
    );
    if (!updatedOrder) {
      return { success: false, status: 404, message: "Order not found" };
    }
    return { success: true, status: 200, data: updatedOrder };
  } catch (error) {
    console.error("Update Order Status Service Error:", error);
    return { success: false, status: 500, message: "Internal server error" };
  }
};

export const getAllOrders = async (data) => {
  try {
    const { userId } = data;
    let filter = {};

    if (userId) {
      filter.userId = userId;
    }
    console.log("Filter", filter);

    const orders = await GamingOrder.find(filter).populate(
      "itemId",
      "itemName price itemImage"
    );
    return { success: true, status: 200, data: orders };
  } catch (error) {
    console.error("Get All Orders Service Error:", error);
    return { success: false, status: 500, message: "Internal server error" };
  }
};

export const getOrderById = async ({ orderId }) => {
  try {
    const order = await GamingOrder.findById(orderId).populate(
      "itemId",
      "itemName price itemImage"
    );
    if (!order) {
      return { success: false, status: 404, message: "Order not found" };
    }
    return { success: true, status: 200, data: order };
  } catch (error) {
    console.error("Get Order By ID Service Error:", error);
    return { success: false, status: 500, message: "Internal server error" };
  }
};

export const updateGamePlayedStatus = async ({ userId }) => {
  try {
    if (!userId) {
      return { success: false, status: 400, message: "User ID is required." };
    }

    // Send an RPC request to the User service to update the user document
    const user = await User.findByIdAndUpdate(userId, {
      "gaming.gamePlayed": true,
    });

    if (!user) {
      console.error("Failed to update user game played status:", user);
      return {
        success: false,
        status: 404,
        message: "User not found or failed to update.",
      };
    }

    return {
      success: true,
      status: 200,
      message: "User game played status updated.",
    };
  } catch (error) {
    console.error("Update Game Played Status Service Error:", error);
    return { success: false, status: 500, message: "Internal server error" };
  }
};

export const updateGameActiveStatusForAllUsers = async ({ status }) => {
  try {
    // Validate that the incoming status is a boolean
    if (typeof status !== "boolean") {
      return {
        success: false,
        status: 400,
        message: "A boolean 'status' field is required.",
      };
    }

    // Use updateMany with an empty filter {} to match all documents
    const updateResult = await User.updateMany(
      {}, // Empty filter matches all users
      { $set: { "gaming.gameActive": status } }
    );

    return {
      success: true,
      status: 200,
      message: `Successfully updated the game active status for ${updateResult.modifiedCount} users to '${status}'.`,
      data: {
        matchedCount: updateResult.matchedCount,
        modifiedCount: updateResult.modifiedCount,
      },
    };
  } catch (error) {
    console.error(
      "Update Game Active Status For All Users Service Error:",
      error
    );
    return { success: false, status: 500, message: "Internal server error" };
  }
};
