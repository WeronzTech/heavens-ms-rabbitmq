import { createResponder } from "../../../../libs/common/rabbitMq.js";
import { CLIENT_PATTERN } from "../../../../libs/patterns/client/client.pattern.js";
import {
  approveClient,
  forgotPassword,
  getClientByEmail,
  registerAdmin,
  registerClient,
  resetPassword,
  validateClientCredentials,
  verifyEmail,
} from "../service/client.service.js";

createResponder(CLIENT_PATTERN.CLIENT.GET_CLIENT_BY_EMAIL, async (data) => {
  return await getClientByEmail(data?.email);
});

createResponder(CLIENT_PATTERN.CLIENT.VALIDATE_CREDENTIALS, async (data) => {
  return await validateClientCredentials(data);
});

createResponder(CLIENT_PATTERN.CLIENT.REGISTER_ADMIN, async (data) => {
  return await registerAdmin(data);
});

createResponder(CLIENT_PATTERN.CLIENT.REGISTER_CLIENT, async (data) => {
  return await registerClient(data);
});

createResponder(CLIENT_PATTERN.CLIENT.VERIFY_EMAIL, async (data) => {
  return await verifyEmail(data);
});

createResponder(CLIENT_PATTERN.CLIENT.FORGOT_PASSWORD, async (data) => {
  return await forgotPassword(data);
});

createResponder(CLIENT_PATTERN.CLIENT.RESET_PASSWORD, async (data) => {
  return await resetPassword(data);
});

createResponder(CLIENT_PATTERN.CLIENT.APPROVE_CLIENT, async (data) => {
  return await approveClient(data);
});
