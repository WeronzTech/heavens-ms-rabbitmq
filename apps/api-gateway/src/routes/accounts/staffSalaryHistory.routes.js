import { Router } from "express";
import {
  manualAddSalary,
  getAllSalaryRecords,
} from "../../controllers/accounts/staffSalaryHistory.controller.js";
import { isAuthenticated } from "../../middleware/isAuthenticated.js";
import { hasPermission } from "../../middleware/hasPermission.js";
import { PERMISSIONS } from "../../../../../libs/common/permissions.list.js";

const salaryRoutes = Router();

salaryRoutes.use(isAuthenticated);

salaryRoutes
  .route("/")
  .get(hasPermission(PERMISSIONS.SALARY_VIEW), getAllSalaryRecords)
  .post(hasPermission(PERMISSIONS.SALARY_MANAGE), manualAddSalary);

export default salaryRoutes;
