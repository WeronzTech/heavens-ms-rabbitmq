import {createResponder} from "../../../../libs/common/rabbitMq.js";
import {USER_PATTERN} from "../../../../libs/patterns/user/user.pattern.js";
import {
  createAppSettings,
  getAppSettings,
  getAppSettingsForAdminPanel,
  updateAppSettings,
} from "../services/appSettings.service.js";

createResponder(USER_PATTERN.SETTINGS.CREATE_APP_SETTINGS, async (data) => {
  return await createAppSettings(data);
});

createResponder(USER_PATTERN.SETTINGS.UPDATE_APP_SETTINGS, async (data) => {
  return await updateAppSettings(data);
});

createResponder(USER_PATTERN.SETTINGS.GET_APP_SETTINGS, async (data) => {
  return await getAppSettings(data);
});

createResponder(USER_PATTERN.SETTINGS.GET_APP_SETTINGS_ADMIN, async (data) => {
  return await getAppSettingsForAdminPanel();
});
