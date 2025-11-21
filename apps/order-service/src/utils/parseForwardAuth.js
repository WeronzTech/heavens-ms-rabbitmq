export const parseForwardedAuth = (req, res, next) => {
  const userId = req.headers["x-user-id"];
  const userRole = req.headers["x-user-role"];

  if (userId) req.userAuth = userId;
  if (userRole) req.userRole = userRole;

  next();
};
