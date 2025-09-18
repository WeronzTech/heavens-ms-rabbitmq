import { createResponder } from "../../../../libs/common/rabbitMq.js";
import {
  forgotPasswordUser,
  refreshAccessToken,
  resetPassword,
  tenantLogin,
  userLogin,
} from "../services/auth.service.js";
import { AUTH_PATTERN } from "../../../../libs/patterns/auth/auth.pattern.js";

createResponder(AUTH_PATTERN.AUTH.TENANT_LOGIN, async (data) => {
  return await tenantLogin(data);
});

createResponder(AUTH_PATTERN.AUTH.USER_LOGIN, async (data) => {
  return await userLogin(data);
});

createResponder(AUTH_PATTERN.AUTH.FORGOT_PASSWORD_USER, async (data) => {
  return await forgotPasswordUser(data);
});

createResponder(AUTH_PATTERN.AUTH.RESET_PASSWORD_USER, async (data) => {
  return await resetPassword(data);
});

createResponder(AUTH_PATTERN.AUTH.REFRESH_ACCESS_TOKEN, async (data) => {
  return await refreshAccessToken(data);
});
