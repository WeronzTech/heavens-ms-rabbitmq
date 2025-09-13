import mongoose from "mongoose";
import {Maintenance} from "../models/maintenance.model.js";
import Property from "../models/property.model.js";
import Staff from "../models/staff.model.js";

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
      clientId,
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
      deposit,
      kitchenId,
      clientId,
      images,
    };

    const property = new Property({ ...propertyData, isHeavens: true });
    const savedProperty = await property.save();
    console.log(savedProperty)

    // try {
    //   await PropertyLog.create({
    //     propertyId: savedProperty._id,
    //     action: "create",
    //     category: "property",
    //     changedByName: adminName,
    //     message: `Property "${savedProperty.propertyName}" created at ${Location} by ${adminName}`,
    //   });
    // } catch (logError) {
    //   console.error("Failed to save property creation log:", logError);
    // }

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
      ...rest
    } = data;
    console.log(data)

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
      deposit,
      kitchenId,
      images,
    };

    const updatedProperty = await Property.findByIdAndUpdate(
      req.params.id,
      propertyData,
      { new: true, runValidators: true }
    );

    if (!updatedProperty) {
      return res.status(404).json({
        success: false,
        message: "Property not found",
      });
    }

    // Optional logging
    // try {
    //   await PropertyLog.create({
    //     propertyId: updatedProperty._id,
    //     action: "update",
    //     category: "property",
    //     changedByName: adminName,
    //     message: `Property "${updatedProperty.propertyName}" updated by ${adminName} at ${Location}`,
    //   });
    // } catch (logError) {
    //   console.error("Failed to save property update log:", logError);
    // }

    return {
      success: true,
      status: 201,
      message: "Property updated successfully",
      data: updatedProperty,
    };
  } catch (error) {
    console.error("Update Property Error:", error);
    return {
      status:400,
      success: false,
      message: "Failed to update property",
      error: error.message,
    };
  }
};
