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
import { isAuthenticated } from "../../middleware/isAuthenticated.js";
import { hasPermission } from "../../middleware/hasPermission.js";
import { PERMISSIONS } from "../../../../../libs/common/permissions.list.js";

const maintenanceRoutes = Router();

maintenanceRoutes.use(isAuthenticated);

maintenanceRoutes.route("/create").post(
  hasPermission(PERMISSIONS.MAINTENANCE_MANAGE),
  upload.fields([
    {
      name: "issueImage",
      maxCount: 1,
    },
  ]),
  createMaintenance
);

maintenanceRoutes
  .route("/")
  .get(hasPermission(PERMISSIONS.MAINTENANCE_VIEW), getAllMaintenance);
maintenanceRoutes
  .route("/by-property/:propertyId")
  .get(hasPermission(PERMISSIONS.MAINTENANCE_VIEW), getMaintenanceByProperty);
maintenanceRoutes
  .route("/by-user/:userId")
  .get(hasPermission(PERMISSIONS.MAINTENANCE_VIEW), getMaintenanceByUserId);
maintenanceRoutes
  .route("/assign-staff/:maintenanceId")
  .patch(
    hasPermission(PERMISSIONS.MAINTENANCE_MANAGE),
    assignStaffToMaintenance
  );
maintenanceRoutes
  .route("/resolve/:maintenanceId")
  .patch(hasPermission(PERMISSIONS.MAINTENANCE_MANAGE), markAsResolved);
maintenanceRoutes
  .route("/:maintenanceId")
  .get(hasPermission(PERMISSIONS.MAINTENANCE_VIEW), getMaintenanceById);
maintenanceRoutes
  .route("/:id")
  .put(hasPermission(PERMISSIONS.MAINTENANCE_MANAGE), updateMaintenance);
maintenanceRoutes
  .route("/delete/:id")
  .delete(hasPermission(PERMISSIONS.MAINTENANCE_MANAGE), deleteMaintenance);

export default maintenanceRoutes;
