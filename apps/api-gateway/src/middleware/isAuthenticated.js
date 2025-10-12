// import { getTokenFromHeader } from "../utils/getTokenFromHeader";
import { sendRPCRequest } from "../../../../libs/common/rabbitMq.js";
import { USER_PATTERN } from "../../../../libs/patterns/user/user.pattern.js";
import { getTokenFromHeader } from "../utils/getTokenFromHeader.js";
import { verifyToken } from "../utils/verifyToken.js";

const isAuthenticated = async (req, res, next) => {
  const token = getTokenFromHeader(req);

  const decodedUser = verifyToken(token);

  const userServiceResponse = await sendRPCRequest(
    USER_PATTERN.USER.GET_USER_BY_ID,
    { userId: decodedUser.id }
  );
  if (userServiceResponse.body.success) {
    req.userRole = "68eb52a92289c6788c8511a7";
  } else {
    req.userRole = decodedUser?.roleId;
  }

  req.userAuth = decodedUser?.id;
  req.userName = decodedUser?.userName;

  if (!decodedUser) {
    res.status(401).json({
      error: "User not authenticated",
    });
    return;
  } else {
    next();
  }
};

export { isAuthenticated };
