import Property from "../models/property.model";

export const addRoom = async (data) => {
    const {
      roomNo,
      roomCapacity,
      status,
      propertyId,
      propertyName,
      isHeavens,
      sharingType,
      description,
      adminName,
    } = data;
  
    // ✅ Validate required fields
    if (!propertyId || !roomNo || !roomCapacity || !propertyName || !sharingType) {
      return { status: 400, message: "Missing required fields" };
    }
  
    // ✅ Fetch property
    const property = await Property.findById(propertyId);
    if (!property) {
      return { status: 404, message: "Property not found" };
    }
  
    // ✅ Check if sharingType exists
    if (!(property.sharingPrices instanceof Map && property.sharingPrices.has(sharingType))) {
      return {
        status: 400,
        message: `${sharingType} is not defined in this property's sharing prices.`,
      };
    }
  
    // ✅ Check if room already exists
    const existingRoom = await Room.findOne({ propertyId, roomNo });
    if (existingRoom) {
      return {
        status: 409,
        message: "Room number already exists under this property",
      };
    }
  
    const session = await mongoose.startSession();
    session.startTransaction();
  
    try {
      const newRoom = new Room({
        roomNo,
        roomCapacity,
        status: status || "available",
        propertyId,
        propertyName,
        sharingType,
        occupant: 0,
        vacantSlot: roomCapacity,
        isHeavens,
        description,
      });
  
      const savedRoom = await newRoom.save({ session });
  
      const updatedProperty = await Property.findByIdAndUpdate(
        propertyId,
        { $inc: { totalBeds: roomCapacity } },
        { new: true, session }
      );
  
      if (!updatedProperty) {
        throw new Error("Property not found after room creation");
      }
  
      await session.commitTransaction();
      session.endSession();
  
    //   try {
    //     await PropertyLog.create({
    //       propertyId,
    //       action: "update",
    //       category: "property",
    //       changedByName: adminName,
    //       message: `Room ${roomNo} (capacity: ${roomCapacity}, sharing type: ${sharingType}) added to property "${propertyName}" by ${adminName}`,
    //     });
    //   } catch (logError) {
    //     console.error("Failed to save property log (addRoom):", logError);
    
  
      return {
        status: 200,
        data: {
          room: savedRoom,
          updatedPropertyStats: {
            totalBeds: updatedProperty.totalBeds,
          },
        },
      };
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      return {
        status: 500,
        message: error.message || "Server error while adding room",
      };
    }
  };