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


const commissionRoutes = Router();

commissionRoutes.route("/").post(addCommission).get(getAllCommissions);

commissionRoutes.get("/check-user", isAuthenticated, checkUserCommission);

commissionRoutes.get("/by-property",  getCommissionByPropertyController);

commissionRoutes
  .route("/:commissionId")
  .get(getCommissionById)
  .put(editCommission)
  .delete(deleteCommission);

export default commissionRoutes;
