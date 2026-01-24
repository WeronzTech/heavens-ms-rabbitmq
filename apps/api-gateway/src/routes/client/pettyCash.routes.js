import express from "express";
import {
  addPettyCashController,
  getPettyCashByManagerController,
  getPettyCashController,
  getPettyCashTransactionsByManagerController,
} from "../../controllers/client/pettyCash.controller.js";
import { isAuthenticated } from "../../middleware/isAuthenticated.js";
import { hasPermission } from "../../middleware/hasPermission.js";
import { PERMISSIONS } from "../../../../../libs/common/permissions.list.js";

const pettyCashRoutes = express.Router();

pettyCashRoutes.use(isAuthenticated);

pettyCashRoutes.post(
  "/add",
  hasPermission(PERMISSIONS.PETTY_CASH_MANAGE),
  addPettyCashController
);

pettyCashRoutes.get(
  "/",
  hasPermission(PERMISSIONS.PETTY_CASH_VIEW),
  getPettyCashController
);


pettyCashRoutes.get(
  "/transaction/:id",
  hasPermission(PERMISSIONS.PETTY_CASH_VIEW),
  getPettyCashTransactionsByManagerController
);

pettyCashRoutes.get(
  "/:id",
  hasPermission(PERMISSIONS.PETTY_CASH_VIEW),
  getPettyCashByManagerController
);




export default pettyCashRoutes;
