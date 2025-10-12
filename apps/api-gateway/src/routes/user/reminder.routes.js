import express from "express";
import {
  completeReminder,
  createNote,
  deleteNote,
  getActiveReminders,
  getUserNotes,
  snoozeReminder,
} from "../../controllers/user/reminder.controller.js";

const reminderRoutes = express.Router();

reminderRoutes.post("/", createNote);
reminderRoutes.get("/activeReminders", getActiveReminders);
reminderRoutes.get("/:id", getUserNotes);
reminderRoutes.patch("/:id/complete", completeReminder);
reminderRoutes.patch("/:id/snooze", snoozeReminder);
reminderRoutes.delete("/:id", deleteNote);

export default reminderRoutes;
