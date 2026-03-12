import mongoose from "mongoose";
import { Maintenance } from "../models/maintenance.model.js";
import Property from "../models/property.model.js";
import Staff from "../models/staff.model.js";
import PropertyLog from "../models/propertyLog.model.js";
import { sendRPCRequest } from "../../../../libs/common/rabbitMq.js";
import { ACCOUNTS_PATTERN } from "../../../../libs/patterns/accounts/accounts.pattern.js";

// export const getLatestMaintenanceData = async (propertyId) => {
//   const filter = {};
//   if (propertyId) {
//     filter.propertyId = propertyId;
//   }

//   const [count, latest] = await Promise.all([
//     Maintenance.countDocuments({...filter, status: "Pending"}),

//     Maintenance.find(filter).sort({createdAt: -1}).limit(4).lean(),
//   ]);

//   return {count, latest};
// };

// export const getEmployeeCount = async (propertyId) => {
//   const filter = {status: "Active"}; // fixed spelling

//   if (propertyId) {
//     filter.propertyId = new mongoose.Types.ObjectId(propertyId);
//   }

//   return Staff.countDocuments(filter);
// };

// export const calculateOccupancyRate = async (propertyId) => {
//   const propertyFilter = propertyId ? {_id: propertyId} : {};

//   const properties = await Property.find(propertyFilter, {
//     totalBeds: 1,
//     occupiedBeds: 1,
//   });

//   const totals = properties.reduce(
//     (acc, property) => {
//       acc.totalBeds += property.totalBeds || 0;
//       acc.occupiedBeds += property.occupiedBeds || 0;
//       return acc;
//     },
//     {totalBeds: 0, occupiedBeds: 0}
//   );

//   const {totalBeds, occupiedBeds} = totals;

//   return {
//     occupancyRate:
//       totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0,
//     totalBeds,
//     occupiedBeds,
//   };
// };

export const createProperty = async (data) => {
  try {
    const {
      state,
      city,
      location,
      branch,
      phase,
      propertyName,
      sharingPrices,
      deposit,
      kitchenId,
      images,
      adminName,
      totalFloors,
      clientId,
      razorpayCredentials,
      rentDetails,
      ...rest
    } = data;
    // console.log(data);

    const clean = (str) => str?.trim();

    const baseData = {
      state: clean(state),
      city: clean(city),
      location: clean(location),
      branch: clean(branch),
      phase: clean(phase),
      propertyName: clean(propertyName),
    };

    const locationParts = Object.values(baseData).filter(Boolean);
    const Location = locationParts.join(", ");

    const propertyData = {
      ...rest,
      ...baseData,
      location: Location,
      sharingPrices,
      totalFloors,
      deposit,
      kitchenId,
      clientId,
      razorpayCredentials,
      rentDetails,
      images,
    };

    const property = new Property({ ...propertyData, isHeavens: true });
    const savedProperty = await property.save();
    console.log(savedProperty);

    try {
      await PropertyLog.create({
        propertyId: savedProperty._id,
        action: "create",
        category: "property",
        changedByName: adminName,
        message: `Property "${savedProperty.propertyName}" created at ${Location} by ${adminName}`,
      });
    } catch (logError) {
      console.error("Failed to save property creation log:", logError);
    }

    return {
      success: true,
      status: 201,
      message: "Property created",
      savedProperty,
    };
  } catch (error) {
    console.error("Create Property Error:", error);
    return {
      success: false,
      status: 500,
      message: "Failed to create property",
      error: error.message,
    };
  }
};
export const updateProperty = async (data) => {
  try {
    const {
      id,
      state,
      city,
      location,
      branch,
      phase,
      propertyName,
      sharingPrices,
      deposit,
      totalFloors,
      kitchenId,
      images,
      adminName,
      razorpayCredentials,
      rentDetails,
      ...rest
    } = data;
    console.log(data);

    const clean = (str) => str?.trim();

    const baseData = {
      state: clean(state),
      city: clean(city),
      location: clean(location),
      branch: clean(branch),
      phase: clean(phase),
      propertyName: clean(propertyName),
    };

    const locationParts = Object.values(baseData).filter(Boolean);
    const Location = locationParts.join(", ");

    const propertyData = {
      ...rest,
      ...baseData,
      location: Location,
      sharingPrices,
      totalFloors,
      deposit,
      kitchenId,
      razorpayCredentials,
      rentDetails,
      images,
    };

    const updatedProperty = await Property.findByIdAndUpdate(id, propertyData, {
      new: true,
      runValidators: true,
    });

    if (!updatedProperty) {
      return {
        success: false,
        status: 404,
        message: "Property not found",
      };
    }

    // Optional logging
    try {
      await PropertyLog.create({
        propertyId: updatedProperty._id,
        action: "update",
        category: "property",
        changedByName: adminName,
        message: `Property "${updatedProperty.propertyName}" updated by ${adminName} at ${Location}`,
      });
    } catch (logError) {
      console.error("Failed to save property update log:", logError);
    }

    return {
      success: true,
      status: 201,
      message: "Property updated successfully",
      data: updatedProperty,
    };
  } catch (error) {
    console.error("Update Property Error:", error);
    return {
      status: 400,
      success: false,
      message: "Failed to update property",
      error: error.message,
    };
  }
};
export const deleteProperty = async (data) => {
  try {
    const { id } = data;

    const deletedProperty = await Property.findByIdAndDelete(id);

    if (!deletedProperty) {
      return {
        success: false,
        status: 404,
        message: "Property not found",
      };
    }
    return {
      success: true,
      status: 200,
      message: "Property deleted successfully",
      data: deletedProperty,
    };
  } catch (error) {
    console.error("Delete Property Error:", error);
    return {
      success: false,
      status: 500,
      message: "Failed to delete property",
      error: error.message,
    };
  }
};

export const getPropertyById = async (data) => {
  try {
    const { id } = data;

    if (!id) {
      return {
        success: false,
        status: 400,
        message: "Property ID is required",
      };
    }

    const property = await Property.findById(id);

    if (!property) {
      return {
        success: false,
        status: 404,
        message: "Property not found",
      };
    }

    return {
      success: true,
      status: 200,
      message: "Property fetched successfully",
      data: property,
    };
  } catch (error) {
    console.error("Get Property By ID Error:", error);
    return {
      success: false,
      status: 500,
      message: "Failed to fetch property",
      error: error.message,
    };
  }
};

export const getAllHeavensProperties = async (data) => {
  try {
    const { propertyId } = data; // get propertyId from RPC payload

    let heavensProperties;

    if (propertyId) {
      const property = await Property.findOne({
        _id: propertyId,
        isHeavens: true,
      });

      if (!property) {
        return {
          success: false,
          status: 404,
          message: "Property not found",
          data: null,
        };
      }

      heavensProperties = [property]; // wrap in array
    } else {
      heavensProperties = await Property.find({ isHeavens: true });
    }

    return {
      success: true,
      status: 200,
      message: "Heavens properties fetched successfully",
      data: heavensProperties,
    };
  } catch (error) {
    console.error("Fetch Heavens Properties Service Error:", error);
    return {
      success: false,
      status: 500,
      message: "Failed to fetch heavens properties",
      error: error.message,
      data: null,
    };
  }
};

export const getClientProperties = async (data) => {
  try {
    const { clientId } = data; // clientId comes from RPC payload
    if (!clientId) {
      return {
        success: false,
        status: 400,
        message: "Client ID is required",
        data: null,
      };
    }

    const properties = await Property.find({ clientId });

    return {
      success: true,
      status: 200,
      message: "Properties fetched successfully",
      data: properties,
    };
  } catch (error) {
    console.error("Fetch Client Properties Service Error:", error);
    return {
      success: false,
      status: 500,
      message: "Failed to fetch properties",
      error: error.message,
      data: null,
    };
  }
};

export const calculateOccupancyRate = async (data) => {
  const { propertyId } = data;
  const propertyFilter = propertyId ? { _id: propertyId } : {};

  const properties = await Property.find(propertyFilter, {
    totalBeds: 1,
    occupiedBeds: 1,
  });

  const totals = properties.reduce(
    (acc, property) => {
      acc.totalBeds += property.totalBeds || 0;
      acc.occupiedBeds += property.occupiedBeds || 0;
      return acc;
    },
    { totalBeds: 0, occupiedBeds: 0 },
  );

  const { totalBeds, occupiedBeds } = totals;

  return {
    occupancyRate:
      totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0,
    totalBeds,
    occupiedBeds,
  };
};

export const payPropertyRent = async (data) => {
  try {
    const {
      propertyId,
      amount,
      paymentMethod,
      transactionId,
      paidByUserId,
      paidByName,
      imageUrl,
    } = data;

    const property = await Property.findById(propertyId);
    if (!property) {
      return { success: false, status: 404, message: "Property not found" };
    }

    // 1. Update Property Balance
    property.rentDetails.pendingBalance =
      (property.rentDetails.pendingBalance || 0) - Number(amount);
    property.rentDetails.lastPaymentDate = new Date();
    await property.save();

    // 2. Create Expense in Accounts Service via RPC
    // We construct the payload to match Expense Model in Accounts Service
    const expensePayload = {
      title: `Rent Payment - ${property.propertyName}`,
      type: "Property Rent",
      category: "Rent", // Ensure this category exists in Accounts
      description: `Rent payment for property ${property.propertyName}. Transaction ID: ${transactionId || "N/A"}`,
      paymentMethod: paymentMethod || "Cash",
      amount: Number(amount),
      date: new Date(),
      property: {
        id: property._id,
        name: property.propertyName,
      },
      clientId: property.clientId,
      actionPerformedBy: paidByName,
      createdBy: paidByUserId,
      imageUrl: imageUrl || "",
      transactionId: transactionId,
    };

    console.log("expensePayload", expensePayload);
    // Note: You might need to adjust the pattern string based on your actual accounts.pattern.js
    const accountResponse = await sendRPCRequest(
      ACCOUNTS_PATTERN.EXPENSE.ADD_EXPENSE,
      expensePayload,
    );

    // 3. Log the action
    await PropertyLog.create({
      propertyId: property._id,
      action: "rent_payment",
      category: "property",
      changedByName: paidByName,
      message: `Rent payment of ₹${amount} made for ${property.propertyName}`,
    });

    return {
      success: true,
      status: 200,
      message: "Rent payment successful and recorded in accounts.",
      data: {
        updatedBalance: property.rentDetails.pendingBalance,
        accountResponse: accountResponse,
      },
    };
  } catch (error) {
    console.error("Pay Rent Error:", error);
    return {
      success: false,
      status: 500,
      message: "Failed to process rent payment",
      error: error.message,
    };
  }
};
