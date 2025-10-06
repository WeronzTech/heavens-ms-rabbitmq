import { createResponder } from "../../../../libs/common/rabbitMq.js";
import { ACCOUNTS_PATTERN } from "../../../../libs/patterns/accounts/accounts.pattern.js";
import {
  manualAddSalary,
  getAllSalaryRecords,
} from "../service/staffSalaryHistory.service.js";

createResponder(ACCOUNTS_PATTERN.SALARY.MANUAL_CREATE, async (data) => {
  return await manualAddSalary(data);
});

createResponder(ACCOUNTS_PATTERN.SALARY.GET_ALL, async (data) => {
  return await getAllSalaryRecords(data);
});
