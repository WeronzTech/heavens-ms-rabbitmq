import { Router } from "express";
import {
  addCommission,
  getAllCommissions,
  getCommissionById,
  editCommission,
  deleteCommission,
  checkUserCommission,
  getCommissionByPropertyController,
} from "../../controllers/accounts/commission.controller.js";
import { isAuthenticated } from "../../middleware/isAuthenticated.js";
import { hasPermission } from "../../middleware/hasPermission.js";
import { PERMISSIONS } from "../../../../../libs/common/permissions.list.js";

const commissionRoutes = Router();

commissionRoutes.use(isAuthenticated);

commissionRoutes
  .route("/")
  .post(hasPermission(PERMISSIONS.COMMISSION_MANAGE), addCommission)
  .get(hasPermission(PERMISSIONS.COMMISSION_MANAGE), getAllCommissions);

commissionRoutes.get(
  "/check-user",
  hasPermission(PERMISSIONS.COMMISSION_MANAGE),
  checkUserCommission,
);

commissionRoutes.get(
  "/by-property",
  hasPermission(PERMISSIONS.COMMISSION_MANAGE),
  getCommissionByPropertyController,
);

commissionRoutes
  .route("/:commissionId")
  .get(hasPermission(PERMISSIONS.COMMISSION_MANAGE), getCommissionById)
  .put(hasPermission(PERMISSIONS.COMMISSION_MANAGE), editCommission)
  .delete(hasPermission(PERMISSIONS.COMMISSION_MANAGE), deleteCommission);

export default commissionRoutes;
