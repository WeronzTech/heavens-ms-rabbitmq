import express from "express";

import {isAuthenticated} from "../../middleware/isAuthenticated.js";
import {hasPermission} from "../../middleware/hasPermission.js";
import {PERMISSIONS} from "../../../../../libs/common/permissions.list.js";

import {
  createSalaryAdvance,
  generateMissingPayroll,
  getEmployeeTransactionHistory,
  getEmployeeAdvanceForMonth,
  getPayrolls,
  processSalaryPayment,
  updatePayrollLeave,
  editPayrollSalary,
} from "../../controllers/accounts/payroll.controller.js";

const payrollRoutes = express.Router();

payrollRoutes.use(isAuthenticated);

/* =========================
   Payroll
========================= */

payrollRoutes.get(
  "/getAllPayroll",
  hasPermission(PERMISSIONS.PAYROLL_VIEW),
  getPayrolls,
);

payrollRoutes.post(
  "/generate-missing",
  hasPermission(PERMISSIONS.PAYROLL_MANAGE),
  generateMissingPayroll,
);

/* =========================
   Transactions
========================= */

payrollRoutes.get(
  "/transactions/:employeeId",
  hasPermission(PERMISSIONS.PAYROLL_VIEW),
  getEmployeeTransactionHistory,
);

payrollRoutes.get(
  "/advance-transactions/:employeeId",
  hasPermission(PERMISSIONS.PAYROLL_VIEW),
  getEmployeeAdvanceForMonth,
);

/* =========================
   Payments
========================= */

payrollRoutes.post(
  "/make-payment",
  hasPermission(PERMISSIONS.PAYROLL_MANAGE),
  processSalaryPayment,
);

payrollRoutes.post(
  "/make-advance-payment",
  hasPermission(PERMISSIONS.PAYROLL_MANAGE),
  createSalaryAdvance,
);

/* =========================
   Payroll Updates
========================= */

payrollRoutes.put(
  "/update-leave/:payrollId",
  hasPermission(PERMISSIONS.PAYROLL_MANAGE),
  updatePayrollLeave,
);

payrollRoutes.put(
  "/update-salary/:payrollId",
  hasPermission(PERMISSIONS.PAYROLL_MANAGE),
  editPayrollSalary,
);

export default payrollRoutes;
