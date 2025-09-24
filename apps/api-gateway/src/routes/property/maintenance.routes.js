import { Router } from "express";
import {
  createMaintenance,
  getMaintenanceByProperty,
  assignStaffToMaintenance,
  markAsResolved,
  getMaintenanceById,
  getMaintenanceByUserId,
  getAllMaintenance,
  updateMaintenance,
  deleteMaintenance,
} from "../../controllers/property/maintenance.controller.js";
import { upload } from "../../../../../libs/common/imageOperation.js";

const maintenanceRoutes = Router();

maintenanceRoutes.route("/create").post(
  upload.fields([
    {
      name: "issueImage",
      maxCount: 1,
    },
  ]),
  createMaintenance
);

maintenanceRoutes.route("/").get(getAllMaintenance);
maintenanceRoutes
  .route("/by-property/:propertyId")
  .get(getMaintenanceByProperty);
maintenanceRoutes.route("/by-user/:userId").get(getMaintenanceByUserId);
maintenanceRoutes
  .route("/assign-staff/:maintenanceId")
  .patch(assignStaffToMaintenance);
maintenanceRoutes.route("/resolve/:maintenanceId").patch(markAsResolved);
maintenanceRoutes.route("/:maintenanceId").get(getMaintenanceById);
maintenanceRoutes.route("/:id").put(updateMaintenance);
maintenanceRoutes.route("/delete/:id").delete(deleteMaintenance);

export default maintenanceRoutes;
