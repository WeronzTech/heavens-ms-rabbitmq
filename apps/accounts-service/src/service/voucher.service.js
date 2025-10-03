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

  export const deleteVoucher = async (voucherId) => {
    try {
      const deletedVoucher = await Voucher.findByIdAndDelete(voucherId);
  
      if (!deletedVoucher) {
        return {
          success: false,
          status: 404,
          message: "Voucher not found.",
        };
      }
  
      return {
        success: true,
        status: 200,
        message: "Voucher deleted successfully.",
        data: deletedVoucher,
      };
    } catch (error) {
      console.error("Delete Voucher Service Error:", error);
      return {
        success: false,
        status: 500,
        message: "Internal Server Error",
        error: error.message,
      };
    }
  };

  export const getVoucherByProperty = async (propertyId) => {
    try {
      const vouchers = await Voucher.find({ propertyId });
  
      if (!vouchers || vouchers.length === 0) {
        return {
          success: false,
          status: 404,
          message: "No vouchers found for this property.",
        };
      }
  
      return {
        success: true,
        status: 200,
        message: "Vouchers fetched successfully.",
        data: vouchers,
      };
    } catch (error) {
      console.error("Get Voucher By Property Service Error:", error);
      return {
        success: false,
        status: 500,
        message: "Internal Server Error",
        error: error.message,
      };
    }
  };