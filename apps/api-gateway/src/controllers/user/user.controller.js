import { sendRPCRequest } from "../../../../../libs/common/rabbitMq.js";
import { USER_PATTERN } from "../../../../../libs/patterns/user/user.pattern.js";

export const registerUser = async (req, res) => {
  const {
    userType,
    name,
    email,
    contact,
    password,
    stayDetails,
    messDetails,
    referralLink,
    isHeavens,
    personalDetails,
  } = req.body;
  console.log("Here");
  const response = await sendRPCRequest(USER_PATTERN.USER.REGISTER_USER, {
    userType,
    name,
    email,
    contact,
    password,
    stayDetails,
    messDetails,
    referralLink,
    isHeavens,
    personalDetails,
  });

  if (response.status === 200) {
    return res.status(200).json(response?.data);
  } else {
    return res.status(response?.status).json({ message: response.message });
  }
};
