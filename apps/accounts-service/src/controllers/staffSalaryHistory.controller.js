import { createResponder } from "../../../../libs/common/rabbitMq.js";
import { ACCOUNTS_PATTERN } from "../../../../libs/patterns/accounts/accounts.pattern.js";
import {
  manualAddSalary,
  getAllSalaryRecords,
  updateSalaryStatus,
} from "../service/staffSalaryHistory.service.js";

createResponder(ACCOUNTS_PATTERN.SALARY.MANUAL_CREATE, async (data) => {
  return await manualAddSalary(data);
});

createResponder(ACCOUNTS_PATTERN.SALARY.GET_ALL, async (data) => {
  return await getAllSalaryRecords(data);
});

createResponder(ACCOUNTS_PATTERN.SALARY.UPDATE_STATUS, async (data) => {
  return await updateSalaryStatus(data);
});
