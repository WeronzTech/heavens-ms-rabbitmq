import { createResponder } from "../../../../libs/common/rabbitMq.js";
import { ACCOUNTS_PATTERN } from "../../../../libs/patterns/accounts/accounts.pattern.js";
import { getAccountDashboardDataForIncomeSection } from "../service/dashboard.service.js";

createResponder(
  ACCOUNTS_PATTERN.DASHBOARD.GET_ACCOUNT_DASHBAORD_DATA_FOR_INCOME_SECTION,
  async (data) => {
    return await getAccountDashboardDataForIncomeSection(data);
  }
);
