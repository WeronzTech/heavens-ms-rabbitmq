import {Router} from "express";
import {
  createMaintenance,
  assignStaffToMaintenance,
  deleteMaintanance,
  getAllMaintanance,
  getMaintenanceByProperty,
  markAsResolved,
  getMaintenanceById,
  getMaintenanceByUserId,
} from "../controllers/maintenance.controller.js";
import {upload} from "../utils/imageOperation.js";

const maintenanceRouter = Router();

maintenanceRouter.route("/create").post(
  upload.fields([
    {
      name: "issueImage",
      maxCount: 1,
    },
  ]),
  createMaintenance
);

maintenanceRouter
  .route("/by-property/:propertyId")
  .get(getMaintenanceByProperty); // fetch all maintenance records for a specific property

maintenanceRouter.route("/by-user/:userId").get(getMaintenanceByUserId); // fetch all maintenance records by a user

maintenanceRouter
  .route("/assign-staff/:maintenanceId")
  .patch(assignStaffToMaintenance); // assign staff to a maintenance record

maintenanceRouter.route("/resolve/:maintenanceId").patch(markAsResolved); // mark a maintenance record as resolved

maintenanceRouter.route("/:maintenanceId").get(getMaintenanceById); // Fetch a single maintenance record by ID

maintenanceRouter.get("/", getAllMaintanance);

maintenanceRouter.delete("/delete/:id", deleteMaintanance);

export default maintenanceRouter;
