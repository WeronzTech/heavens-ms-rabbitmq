import { verifyToken } from "../utils/verifyToken.js";

const isAuthenticated = (token) => {
  const decodedUser = verifyToken(token);

  if (!decodedUser) {
    return false;
  } else {
    return true;
  }
};

export { isAuthenticated };
