import {createResponder} from "../../../../libs/common/rabbitMq.js";
import {ACCOUNTS_PATTERN} from "../../../../libs/patterns/accounts/accounts.pattern.js";
import {
  createSalaryAdvance,
  editPayrollSalary,
  generateMissingPayrollBulk,
  getEmployeeAdvanceForMonth,
  getEmployeeTransactionHistory,
  getPayrolls,
  processSalaryPayment,
  updatePayrollLeave,
} from "../service/payroll.service.js";

createResponder(ACCOUNTS_PATTERN.PAYROLL.MAKE_PAYMENT, async (data) => {
  return await processSalaryPayment(data);
});

createResponder(ACCOUNTS_PATTERN.PAYROLL.PAYROLL_LEAVE, async (data) => {
  return await updatePayrollLeave(data);
});

createResponder(ACCOUNTS_PATTERN.PAYROLL.ADVANCE_SALARY, async (data) => {
  return await createSalaryAdvance(data);
});

createResponder(ACCOUNTS_PATTERN.PAYROLL.GENERATE_MISSING_PAYROLL, async () => {
  return await generateMissingPayrollBulk();
});

createResponder(ACCOUNTS_PATTERN.PAYROLL.GET_ALL_PAYROLL, async (data) => {
  return await getPayrolls(data);
});

createResponder(
  ACCOUNTS_PATTERN.PAYROLL.GET_ALL_TRANSACTION_BY_EMPLOYEEID,
  async (data) => {
    return await getEmployeeTransactionHistory(data);
  },
);

createResponder(
  ACCOUNTS_PATTERN.PAYROLL.GET_ALL_ADVANCE_TRANSACTION_BY_EMPLOYEEID,
  async (data) => {
    return await getEmployeeAdvanceForMonth(data);
  },
);

createResponder(ACCOUNTS_PATTERN.PAYROLL.UPDATE_PAYROLL, async (data) => {
  return await editPayrollSalary(data);
});
