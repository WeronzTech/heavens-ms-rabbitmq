import { Router } from "express";
import {
  manualAddSalary,
  getAllSalaryRecords,
  updateSalaryStatus,
} from "../../controllers/accounts/staffSalaryHistory.controller.js";
import { isAuthenticated } from "../../middleware/isAuthenticated.js";
import { hasPermission } from "../../middleware/hasPermission.js";
import { PERMISSIONS } from "../../../../../libs/common/permissions.list.js";

const salaryRoutes = Router();

salaryRoutes.use(isAuthenticated);

salaryRoutes
  .route("/")
  .get(hasPermission(PERMISSIONS.EMPLOYEE_MANAGE), getAllSalaryRecords)
  .post(hasPermission(PERMISSIONS.EMPLOYEE_MANAGE), manualAddSalary);

salaryRoutes
  .route("/:id/status")
  .patch(hasPermission(PERMISSIONS.EMPLOYEE_MANAGE), updateSalaryStatus);

export default salaryRoutes;
