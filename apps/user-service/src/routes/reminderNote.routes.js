import express from "express";
import {noteController} from "../controllers/reminderNote.controller.js";

const router = express.Router();

// Create a new note
router.post("/", noteController.createNote);

// Get all notes for a user
router.get("/:id", noteController.getUserNotes);

// Get all active reminders (for dashboard)
router.get("/reminders", noteController.getActiveReminders);

// Mark reminder as completed
router.patch("/:id/complete", noteController.completeReminder);

// Snooze a reminder
router.patch("/:id/snooze", noteController.snoozeReminder);

// Delete a note
router.delete("/:id", noteController.deleteNote);

// Admin endpoint to mark overdue reminders (typically called via cron job)
router.post("/mark-overdue", noteController.markOverdueReminders);

export default router;
