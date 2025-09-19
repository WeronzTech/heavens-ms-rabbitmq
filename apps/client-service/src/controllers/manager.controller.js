import { createResponder } from "../../../../libs/common/rabbitMq.js";
import { CLIENT_PATTERN } from "../../../../libs/patterns/client/client.pattern.js";
import {
  changeManagerStatus,
  deleteManager,
  editManager,
  forgotPasswordManager,
  getAllManagers,
  getManagerByEmail,
  registerManager,
  resetPasswordManager,
  validateManagerCredentials,
} from "../service/manager.service.js";

createResponder(CLIENT_PATTERN.MANAGER.REGISTER_MANAGER, async (data) => {
  return await registerManager(data);
});

createResponder(CLIENT_PATTERN.MANAGER.GET_MANAGER_BY_EMAIL, async (data) => {
  return await getManagerByEmail(data);
});

createResponder(
  CLIENT_PATTERN.MANAGER.VALIDATE_MANAGER_CREDENTIALS,
  async (data) => {
    return await validateManagerCredentials(data);
  }
);

createResponder(
  CLIENT_PATTERN.MANAGER.FORGOT_PASSWORD_MANAGER,
  async (data) => {
    return await forgotPasswordManager(data);
  }
);

createResponder(CLIENT_PATTERN.MANAGER.RESET_PASSWORD_MANAGER, async (data) => {
  return await resetPasswordManager(data);
});

createResponder(CLIENT_PATTERN.MANAGER.GET_ALL_MANAGERS, async (data) => {
  return await getAllManagers(data);
});

createResponder(CLIENT_PATTERN.MANAGER.EDIT_MANAGER, async (data) => {
  return await editManager(data);
});

createResponder(CLIENT_PATTERN.MANAGER.DELETE_MANAGER, async (data) => {
  return await deleteManager(data);
});

createResponder(CLIENT_PATTERN.MANAGER.CHANGE_MANAGER_STATUS, async (data) => {
  return await changeManagerStatus(data);
});
