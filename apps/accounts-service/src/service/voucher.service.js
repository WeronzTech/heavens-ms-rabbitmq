import Voucher from "../models/voucher.model.js";

export const addVoucher = async (data) => {
    try {
      const { user, description, createdBy, amount, propertyId, propertyName } = data;
      
      // Validate required fields
      if (
        !user ||
        !description ||
        !createdBy ||
        !amount ||
        !propertyId ||
        !propertyName
      ) {
        return {
          success: false,
          status: 400,
          message: "Missing required fields.",
        };
      }
  
      // Check if voucher already exists for the user and property
      const existingVoucher = await Voucher.findOne({
        user: user,
        propertyId: propertyId,
        status: { $ne: 'expired' } // Only check non-expired vouchers
      })
      // Validate amount is positive
      if (amount <= 0) {
        return {
          success: false,
          status: 400,
          message: "Amount must be a positive number.",
        };
      }
  
      // Create new voucher
      const newVoucher = await Voucher.create({
        user,
        description,
        createdBy,
        amount,
        propertyId,
        propertyName,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      });
  
      return {
        success: true,
        status: 201,
        message: "Voucher created successfully.",
        data: newVoucher,
      };
    } catch (error) {
      console.error("Add Voucher Service Error:", error);
      return {
        success: false,
        status: 500,
        message: "Internal Server Error",
        error: error.message,
      };
    }
  };