import mongoose from "mongoose";
import Floor from "../models/floor.model.js";
import Property from "../models/property.model.js";
import PropertyLog from "../models/propertyLog.model.js";

/**
 * Create a new floor for a property
 */
export const addFloor = async (data) => {
  const {
    floorName,
    floorNo,
    roomCapacity,
    vacantSlot,
    status,
    description,
    isHeavens,
    propertyId,
    adminName,
    roomIds,
  } = data; // Validation

  // if (!floorName || !roomCapacity || !propertyId) {
  //   return {
  //     success: false,
  //     status: 400,
  //     message: "floorName, floorNo, roomCapacity, and propertyId are required",
  //   };
  // }

  try {
    // Find property
    const property = await Property.findById(propertyId);
    if (!property) {
      return { success: false, status: 404, message: "Property not found" };
    } // Check total floors constraint

    const currentFloorCount = await Floor.countDocuments({ propertyId });
    if (currentFloorCount >= property.totalFloors) {
      return {
        success: false,
        status: 400,
        message: `Cannot add more floors. Property's total floor limit (${property.totalFloors}) reached.`,
      };
    } // Check for duplicate floor number within the same property

    const existingFloor = await Floor.findOne({ propertyId, floorNo });
    if (existingFloor) {
      return {
        success: false,
        status: 409,
        message: "Floor number already exists for this property",
      };
    }

    const newFloor = new Floor({
      floorName,
      floorNo,
      roomCapacity,
      vacantSlot: vacantSlot || roomCapacity, // Default vacant to full capacity if not provided
      status: status || "available",
      description,
      isHeavens: isHeavens !== undefined ? isHeavens : property.isHeavens, // Inherit from property
      propertyId,
      roomIds, // Start with no rooms
    });

    const savedFloor = await newFloor.save(); // Log the creation

    try {
      await PropertyLog.create({
        propertyId,
        action: "create",
        category: "property",
        changedByName: adminName,
        message: `Floor ${savedFloor.floorNo} (${savedFloor.floorName}) created for property "${property.propertyName}" by ${adminName}`,
      });
    } catch (logError) {
      console.error("Failed to save floor creation log:", logError);
    }

    return {
      success: true,
      status: 201,
      message: "Floor created successfully",
      data: savedFloor,
    };
  } catch (error) {
    console.error("Create Floor Error:", error);
    return {
      success: false,
      status: 500,
      message: "Failed to create floor",
      error: error.message,
    };
  }
};

/**
 * Update an existing floor
 */
export const updateFloor = async (data) => {
  const {
    id, // Floor's own _id
    floorName,
    floorNo,
    roomCapacity,
    vacantSlot,
    status,
    description,
    adminName,
    roomIds,
  } = data;

  if (!id) {
    return { success: false, status: 400, message: "Floor ID is required" };
  }

  try {
    const floor = await Floor.findById(id);
    if (!floor) {
      return { success: false, status: 404, message: "Floor not found" };
    }

    const oldValues = {
      floorName: floor.floorName,
      floorNo: floor.floorNo,
      roomCapacity: floor.roomCapacity,
    }; // Check for duplicate floor number if it's being changed

    if (floorNo && floorNo !== floor.floorNo) {
      const existingFloor = await Floor.findOne({
        propertyId: floor.propertyId,
        floorNo,
      });
      if (existingFloor) {
        return {
          success: false,
          status: 409,
          message: "Floor number already exists for this property",
        };
      }
      floor.floorNo = floorNo;
    } // Update other fields if provided

    if (floorName) floor.floorName = floorName;
    if (status) floor.status = status;
    if (description) floor.description = description;

    // Handle capacity updates
    const occupiedSlots = floor.roomCapacity - floor.vacantSlot;
    if (roomCapacity !== undefined) {
      if (roomCapacity < occupiedSlots) {
        return {
          success: false,
          status: 400,
          message: `Room capacity (${roomCapacity}) cannot be less than current occupied slots (${occupiedSlots})`,
        };
      }
      floor.roomCapacity = roomCapacity;
      // Recalculate vacant slots based on new capacity
      floor.vacantSlot = floor.roomCapacity - occupiedSlots;
    }

    // Allow manual override of vacantSlot *after* capacity logic
    if (vacantSlot !== undefined) {
      if (vacantSlot > floor.roomCapacity) {
        return {
          success: false,
          status: 400,
          message: "Vacant slots cannot exceed room capacity",
        };
      }
      floor.vacantSlot = vacantSlot;
    }

    const updatedFloor = await floor.save(); // Log the update

    try {
      const changes = [];
      if (oldValues.floorName !== updatedFloor.floorName)
        changes.push(
          `Name: '${oldValues.floorName}' -> '${updatedFloor.floorName}'`
        );
      if (oldValues.floorNo !== updatedFloor.floorNo)
        changes.push(
          `Floor No: '${oldValues.floorNo}' -> '${updatedFloor.floorNo}'`
        );
      if (oldValues.roomCapacity !== updatedFloor.roomCapacity)
        changes.push(
          `Capacity: ${oldValues.roomCapacity} -> ${updatedFloor.roomCapacity}`
        );

      if (changes.length > 0) {
        await PropertyLog.create({
          propertyId: updatedFloor.propertyId,
          action: "update",
          category: "property",
          changedByName: adminName,
          message: `Floor ${
            oldValues.floorNo
          } updated by ${adminName}: ${changes.join(", ")}`,
        });
      }
    } catch (logError) {
      console.error("Failed to save floor update log:", logError);
    }

    return {
      success: true,
      status: 200,
      message: "Floor updated successfully",
      data: updatedFloor,
    };
  } catch (error) {
    console.error("Update Floor Error:", error);
    return {
      success: false,
      status: 500,
      message: "Failed to update floor",
      error: error.message,
    };
  }
};

/**
 * Delete a floor
 */
export const deleteFloor = async (data) => {
  const { id, adminName } = data; // Floor's own _id

  if (!id) {
    return { success: false, status: 400, message: "Floor ID is required" };
  }

  try {
    const floor = await Floor.findById(id);
    if (!floor) {
      return { success: false, status: 404, message: "Floor not found" };
    } // Check if floor has rooms assigned

    if (floor.roomIds && floor.roomIds.length > 0) {
      return {
        success: false,
        status: 400,
        message: `Cannot delete floor. It has ${floor.roomIds.length} room(s) assigned. Please remove rooms first.`,
      };
    }

    const deletedFloor = await Floor.findByIdAndDelete(id); // Log the deletion

    try {
      await PropertyLog.create({
        propertyId: deletedFloor.propertyId,
        action: "delete",
        category: "property",
        changedByName: adminName,
        message: `Floor ${deletedFloor.floorNo} (${deletedFloor.floorName}) deleted by ${adminName}`,
      });
    } catch (logError) {
      console.error("Failed to save floor deletion log:", logError);
    }

    return {
      success: true,
      status: 200,
      message: "Floor deleted successfully",
      data: deletedFloor,
    };
  } catch (error) {
    console.error("Delete Floor Error:", error);
    return {
      success: false,
      status: 500,
      message: "Failed to delete floor",
      error: error.message,
    };
  }
};

/**
 * Get all floors for a specific property
 */
export const getFloorsByPropertyId = async (data) => {
  const { propertyId } = data;

  if (!propertyId) {
    return {
      success: false,
      status: 400,
      message: "Property ID is required",
    };
  }

  try {
    const floors = await Floor.find({ propertyId })
      .populate({
        path: "propertyId",
        select: "propertyName propertyId totalBeds occupiedBeds", // Select only the fields you need from Property
      })
      .populate({
        path: "roomIds",
        select: "roomNo sharingType roomCapacity vacantSlot status", // Select only the fields you need from Room
      })
      .sort({ floorNo: 1 }); // Sort by floor number

    if (!floors || floors.length === 0) {
      return {
        success: true,
        status: 200, // Not 404, just an empty list
        message: "No floors found for this property",
        data: [],
      };
    }

    return {
      success: true,
      status: 200,
      message: "Floors fetched successfully",
      data: floors,
    };
  } catch (error) {
    console.error("Get Floors Error:", error);
    return {
      success: false,
      status: 500,
      message: "Failed to fetch floors",
      error: error.message,
    };
  }
};

/**
 * Get a single floor by its ID
 */
export const getFloorById = async (data) => {
  const { id } = data; // Floor's own _id

  if (!id) {
    return { success: false, status: 400, message: "Floor ID is required" };
  }

  try {
    const floor = await Floor.findById(id).populate("roomIds"); // Populate rooms

    if (!floor) {
      return { success: false, status: 404, message: "Floor not found" };
    }

    return {
      success: true,
      status: 200,
      message: "Floor fetched successfully",
      data: floor,
    };
  } catch (error) {
    console.error("Get Floor By ID Error:", error);
    return {
      success: false,
      status: 500,
      message: "Failed to fetch floor",
      error: error.message,
    };
  }
};
