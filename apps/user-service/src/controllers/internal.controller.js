import User from "../models/user.model.js";

export const getStudentsByPropertyId = async (req, res) => {
  const {propertyId} = req.params;

  try {
    const users = await User.find({propertyId});

    res.status(200).json({users});
  } catch (error) {
    console.error("Error fetching users by property ID:", error);
    res.status(500).json({error: "Server error"});
  }
};

export const getUserAuthData = async (req, res) => {
  try {
    const {identifier} = req.params;

    const isObjectId = /^[0-9a-fA-F]{24}$/.test(identifier);

    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);

    let query;

    if (isObjectId) {
      query = {_id: identifier};
    } else if (isEmail) {
      query = {email: identifier.toLowerCase()}; // normalize
    } else {
      return res.status(400).json({error: "Invalid identifier format"});
    }

    const user = await User.findOne(query).select(
      "email password isApproved isVerified isLoginEnabled userType currentStatus"
    );
    if (!user) {
      return res.status(404).json({error: "User not found"});
    }

    return res.status(200).json({
      email: user.email,
      password: user.password,
      isApproved: user.isApproved,
      isVerified: user.isVerified,
      isLoginEnabled: user.isLoginEnabled,
      userType: user.userType,
      userId: user._id,
      currentStatus: user.currentStatus,
    });
  } catch (error) {
    console.error("Error fetching user auth data:", error);
    return res.status(500).json({error: "Internal server error"});
  }
};

export const getRoomOccupants = async (req, res) => {
  try {
    const {roomId} = req.params;
    // console.log(roomId);

    // Find users who are occupying the given roomId
    const occupants = await User.find({"stayDetails.roomId": roomId}).select(
      "name paymentStatus contact userType stayDetails"
    );

    if (!occupants || occupants.length === 0) {
      return res.status(404).json({error: "No users found for this room"});
    }

    return res.status(200).json({occupants});
  } catch (error) {
    console.error("Error fetching room occupants:", error);
    return res.status(500).json({error: "Internal server error"});
  }
};

export const getResidentCounts = async (req, res) => {
  try {
    const {propertyId} = req.query; // from query params
    console.log("herererer");
    const filter = {
      isVacated: false,
      isHeavens: true,
    };

    if (propertyId) {
      filter["stayDetails.propertyId"] = propertyId;
    }

    const [monthlyResidents, dailyRenters] = await Promise.all([
      User.countDocuments({...filter, rentType: "monthly"}),
      User.countDocuments({...filter, rentType: "daily"}),
    ]);

    res.json({monthlyResidents, dailyRenters});
  } catch (error) {
    console.error("Error fetching resident counts:", error);
    res.status(500).json({error: "Failed to fetch resident counts"});
  }
};
