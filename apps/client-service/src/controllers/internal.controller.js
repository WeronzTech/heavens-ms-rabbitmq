import Client from "../models/client.modal.js";
import Manager from "../models/manager.model.js";

export const getClientAuthData = async (req, res) => {
  try {
    const {email, roleName} = req.query;
    console.log(req.query);
    let user = null;

    if (roleName === "admin") {
      user = await Client.findOne({email});
    } else if (roleName === "manager") {
      user = await Manager.findOne({email});
    }

    if (!user) {
      return res.status(404).json({success: false, message: "User not found"});
    }

    const safeUser = user.toObject();
    res.status(200).json({success: true, data: safeUser});
  } catch (error) {
    res.status(500).json({success: false, message: error.message});
  }
};
