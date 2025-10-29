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
  .post(hasPermission(PERMISSIONS.AGENCY_MANAGE), isAuthenticated, addAgency);

agencyRoutes
  .route("/:agencyId")
  .get(hasPermission(PERMISSIONS.AGENCY_VIEW), isAuthenticated, getAgencyById)
  .put(hasPermission(PERMISSIONS.AGENCY_MANAGE), isAuthenticated, editAgency)
  .delete(
    hasPermission(PERMISSIONS.AGENCY_MANAGE),
    isAuthenticated,
    deleteAgency
  );

export default agencyRoutes;
