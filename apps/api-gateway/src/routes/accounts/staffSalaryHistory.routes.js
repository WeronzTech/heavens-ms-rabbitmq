import { Router } from "express";
import {
  manualAddSalary,
  getAllSalaryRecords,
} from "../../controllers/accounts/staffSalaryHistory.controller.js";

const salaryRoutes = Router();

salaryRoutes.route("/").get(getAllSalaryRecords).post(manualAddSalary);

export default salaryRoutes;
