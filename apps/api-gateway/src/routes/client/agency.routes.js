import { Router } from "express";
import {
  getAllAgencies,
  addAgency,
  editAgency,
  deleteAgency,
  getAgencyById,
} from "../../controllers/client/agency.controller.js";
import { isAuthenticated } from "../../middleware/isAuthenticated.js";
import { hasPermission } from "../../middleware/hasPermission.js";
import { PERMISSIONS } from "../../../../../libs/common/permissions.list.js";

const agencyRoutes = Router();

// agencyRoutes.use(isAuthenticated);

agencyRoutes
  .route("/")
  .get(getAllAgencies)
  .post(
    isAuthenticated,
    hasPermission(PERMISSIONS.COMMISSION_MANAGE),
    addAgency,
  );

agencyRoutes
  .route("/:agencyId")
  .get(
    isAuthenticated,
    hasPermission(PERMISSIONS.COMMISSION_MANAGE),
    getAgencyById,
  )
  .put(
    isAuthenticated,
    hasPermission(PERMISSIONS.COMMISSION_MANAGE),
    editAgency,
  )
  .delete(
    isAuthenticated,
    hasPermission(PERMISSIONS.COMMISSION_MANAGE),
    deleteAgency,
  );

export default agencyRoutes;
