import { createResponder } from "../../../../libs/common/rabbitMq.js";
import { ACCOUNTS_PATTERN } from "../../../../libs/patterns/accounts/accounts.pattern.js";
import {
  getProfitAndLossReport,
  getBalanceSheetReport,
} from "../service/report.service.js";

createResponder(ACCOUNTS_PATTERN.REPORT.GET_PNL, async (filters) => {
  return await getProfitAndLossReport(filters);
});

createResponder(ACCOUNTS_PATTERN.REPORT.GET_BALANCE_SHEET, async (filters) => {
  return await getBalanceSheetReport(filters);
});
