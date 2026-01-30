import express from "express";
import {
  completeReminder,
  createNote,
  deleteNote,
  getActiveReminders,
  getUserNotes,
  snoozeReminder,
} from "../../controllers/user/reminder.controller.js";
import { isAuthenticated } from "../../middleware/isAuthenticated.js";
import { hasPermission } from "../../middleware/hasPermission.js";
import { PERMISSIONS } from "../../../../../libs/common/permissions.list.js";

const reminderRoutes = express.Router();

reminderRoutes.use(isAuthenticated);

reminderRoutes.post("/", hasPermission(PERMISSIONS.USER_MANAGE), createNote);
reminderRoutes.get(
  "/:id",
  hasPermission(PERMISSIONS.USER_MANAGE),
  getUserNotes,
);
reminderRoutes.get(
  "/active/reminders",
  hasPermission(PERMISSIONS.USER_MANAGE),
  getActiveReminders,
);
reminderRoutes.patch(
  "/:id/complete",
  hasPermission(PERMISSIONS.USER_MANAGE),
  completeReminder,
);
reminderRoutes.patch(
  "/:id/snooze",
  hasPermission(PERMISSIONS.USER_MANAGE),
  snoozeReminder,
);
reminderRoutes.delete(
  "/:id",
  hasPermission(PERMISSIONS.USER_MANAGE),
  deleteNote,
);

export default reminderRoutes;
