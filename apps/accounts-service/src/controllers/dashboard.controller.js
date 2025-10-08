import { createResponder } from "../../../../libs/common/rabbitMq.js";
import { ACCOUNTS_PATTERN } from "../../../../libs/patterns/accounts/accounts.pattern.js";
import {
  getAccountDashboardDataForDepositSection,
  getAccountDashboardDataForExpenseSection,
  getAccountDashboardDataForIncomeSection,
} from "../service/dashboard.service.js";

createResponder(
  ACCOUNTS_PATTERN.DASHBOARD.GET_ACCOUNT_DASHBAORD_DATA_FOR_INCOME_SECTION,
  async (data) => {
    return await getAccountDashboardDataForIncomeSection(data);
  }
);

createResponder(
  ACCOUNTS_PATTERN.DASHBOARD.GET_ACCOUNT_DASHBAORD_DATA_FOR_EXPENESE_SECTION,
  async (data) => {
    return await getAccountDashboardDataForExpenseSection(data);
  }
);

createResponder(
  ACCOUNTS_PATTERN.DASHBOARD.GET_ACCOUNT_DASHBAORD_DATA_FOR_DEPOSIT_SECTION,
  async (data) => {
    return await getAccountDashboardDataForDepositSection(data);
  }
);
