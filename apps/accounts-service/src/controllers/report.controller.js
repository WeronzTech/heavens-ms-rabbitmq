import { createResponder } from "../../../../libs/common/rabbitMq.js";
import { ACCOUNTS_PATTERN } from "../../../../libs/patterns/accounts/accounts.pattern.js";
import {
  getProfitAndLossReport,
  getBalanceSheetReport,
  getDayBook,
  getLedgerReport,
  getGSTR1Report,
} from "../service/report.service.js";

createResponder(ACCOUNTS_PATTERN.REPORT.GET_PNL, async (filters) => {
  return await getProfitAndLossReport(filters);
});

createResponder(ACCOUNTS_PATTERN.REPORT.GET_BALANCE_SHEET, async (filters) => {
  return await getBalanceSheetReport(filters);
});

createResponder(ACCOUNTS_PATTERN.REPORT.GET_DAY_BOOK, async (filters) => {
  return await getDayBook(filters);
});

createResponder(ACCOUNTS_PATTERN.REPORT.GET_LEDGER_REPORT, async (filters) => {
  return await getLedgerReport(filters);
});

createResponder(ACCOUNTS_PATTERN.REPORT.GET_GSTR1_REPORT, async (filters) => {
  return await getGSTR1Report(filters);
});
