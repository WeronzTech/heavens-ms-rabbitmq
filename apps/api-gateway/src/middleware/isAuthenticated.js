// import { getTokenFromHeader } from "../utils/getTokenFromHeader";
import { getTokenFromHeader } from "../utils/getTokenFromHeader.js";
import { verifyToken } from "../utils/verifyToken.js";

const isAuthenticated = (req, res, next) => {
  const token = getTokenFromHeader(req);

  const decodedUser = verifyToken(token);

  req.userAuth = decodedUser.id;
  req.userRole = decodedUser.role;
  req.userName = decodedUser.userName;

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
