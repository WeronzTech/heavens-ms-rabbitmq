import { createResponder } from "../../../../libs/common/rabbitMq.js";
import { ACCOUNTS_PATTERN } from "../../../../libs/patterns/accounts/accounts.pattern.js";
import { getAccountLogs } from "../service/accountsLog.service.js";

createResponder(ACCOUNTS_PATTERN.LOG.GET_ACCOUNT_LOGS, async (data) => {
  return await getAccountLogs(data);
});
