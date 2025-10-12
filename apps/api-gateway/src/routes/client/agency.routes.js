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

agencyRoutes.use(isAuthenticated);

agencyRoutes
  .route("/")
  .get(hasPermission(PERMISSIONS.AGENCY_VIEW), getAllAgencies)
  .post(hasPermission(PERMISSIONS.AGENCY_MANAGE), addAgency);

agencyRoutes
  .route("/:agencyId")
  .get(hasPermission(PERMISSIONS.AGENCY_VIEW), getAgencyById)
  .put(hasPermission(PERMISSIONS.AGENCY_MANAGE), editAgency)
  .delete(hasPermission(PERMISSIONS.AGENCY_MANAGE), deleteAgency);

export default agencyRoutes;
