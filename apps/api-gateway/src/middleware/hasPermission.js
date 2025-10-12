import { PERMISSIONS } from "../../../../libs/common/permissions.list.js";
import { sendRPCRequest } from "../../../../libs/common/rabbitMq.js";
import { AUTH_PATTERN } from "../../../../libs/patterns/auth/auth.pattern.js";

export const hasPermission = (requiredPermission) => {
  return async (req, res, next) => {
    const roleResponse = await sendRPCRequest(
      AUTH_PATTERN.ROLE.GET_ROLE_BY_ID,
      { id: req.userRole }
    );

    const userPermissions = roleResponse.data.permissions || [];

    // Super-admin check
    if (userPermissions.includes(PERMISSIONS.ALL_PRIVILEGES)) {
      return next();
    }

    // Standard permission check
    if (userPermissions.includes(requiredPermission)) {
      return next();
    }

    // If neither check passes, deny access
    return res.status(403).json({
      message:
        "Forbidden: You do not have the required permission to perform this action.",
    });
  };
};
