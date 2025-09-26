import { Router } from "express";
import {
  getAllAgencies,
  addAgency,
  editAgency,
  deleteAgency,
  getAgencyById,
} from "../../controllers/client/agency.controller.js";

const agencyRoutes = Router();

agencyRoutes.route("/").get(getAllAgencies).post(addAgency);

agencyRoutes
  .route("/:agencyId")
  .get(getAgencyById)
  .put(editAgency)
  .delete(deleteAgency);

export default agencyRoutes;
