import DeliveryCharge from "../models/deliveryCharges.model.js"; // Adjust filename if saved differently

export const createDeliveryCharge = async ({ data }) => {
  try {
    const { merchantId, handlingFee, deliveryCharge } = data;

    // Check if a delivery charge configuration already exists for this merchant
    const existingCharge = await DeliveryCharge.findOne({ merchantId });
    if (existingCharge) {
      return {
        status: 409,
        message:
          "Delivery charges already exist for this merchant. Please update the existing record.",
      };
    }

    const newCharge = await DeliveryCharge.create({
      merchantId,
      handlingFee,
      deliveryCharge,
    });

    return {
      status: 201,
      data: {
        message: "Delivery charges set successfully",
        deliveryCharge: newCharge,
      },
    };
  } catch (error) {
    console.error("RPC Create Delivery Charge Error:", error);
    return { status: 500, message: error.message };
  }
};

export const getDeliveryChargeByMerchant = async ({ data }) => {
  try {
    const { merchantId } = data;
    const charge = await DeliveryCharge.findOne({ merchantId });

    if (!charge) {
      return {
        status: 404,
        message: "Delivery charges not found for this merchant",
      };
    }

    return { status: 200, data: { deliveryCharge: charge } };
  } catch (error) {
    return { status: 500, message: error.message };
  }
};

export const updateDeliveryCharge = async ({ data }) => {
  try {
    const { id, handlingFee, deliveryCharge } = data;

    const updatedCharge = await DeliveryCharge.findByIdAndUpdate(
      id,
      {
        ...(handlingFee !== undefined && { handlingFee }),
        ...(deliveryCharge !== undefined && { deliveryCharge }),
      },
      { new: true }
    );

    if (!updatedCharge) {
      return { status: 404, message: "Delivery charge record not found" };
    }

    return {
      status: 200,
      data: {
        message: "Delivery charges updated successfully",
        deliveryCharge: updatedCharge,
      },
    };
  } catch (error) {
    console.error("RPC Update Delivery Charge Error:", error);
    return { status: 500, message: error.message };
  }
};

export const deleteDeliveryCharge = async ({ data }) => {
  try {
    const { id } = data;
    const charge = await DeliveryCharge.findByIdAndDelete(id);

    if (!charge) {
      return { status: 404, message: "Delivery charge record not found" };
    }

    return {
      status: 200,
      data: { message: "Delivery charge record deleted successfully" },
    };
  } catch (error) {
    return { status: 500, message: error.message };
  }
};
