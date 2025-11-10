import { createResponder } from "../../../../libs/common/rabbitMq.js";
import { ACCOUNTS_PATTERN } from "../../../../libs/patterns/accounts/accounts.pattern.js";
import {
  setAccountMapping,
  getAccountMappings,
  getAvailableSystemNames,
  clearAccountCache,
} from "../service/accountSetting.service.js";

createResponder(ACCOUNTS_PATTERN.ACCOUNT_SETTING.SET_MAPPING, async (data) => {
  return await setAccountMapping(data);
});

createResponder(ACCOUNTS_PATTERN.ACCOUNT_SETTING.GET_MAPPINGS, async () => {
  return await getAccountMappings();
});

createResponder(ACCOUNTS_PATTERN.ACCOUNT_SETTING.GET_SYSTEM_NAMES, async () => {
  return await getAvailableSystemNames();
});

createResponder(ACCOUNTS_PATTERN.ACCOUNT_SETTING.CLEAR_CACHE, async () => {
  return await clearAccountCache();
});
