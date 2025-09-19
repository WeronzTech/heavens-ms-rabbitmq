import Note from "../models/reminderNote.modal.js";
import User from "../models/user.model.js";

// Helper function to validate reminder dates
const validateReminderDate = (date) => {
  if (!date) return false;
  return new Date(date) > new Date();
};

export const noteController = {
  // Create a new note (with or without reminder)
  createNote: async (data) => {
    try {
      const { createdBy, userId, content, isReminder, reminderDate } = data;
      console.log(data);
      // Validate user exists
      const user = await User.findById(userId);
      if (!user) {
        return { status: 404, success: false, message: "User not found" };
      }
      // Validate reminder date if it's a reminder
      if (isReminder && !validateReminderDate(reminderDate)) {
        return {
          status: 400,
          success: false,
          message: "Invalid reminder date",
        };
      }

      const newNote = await Note.create({
        userId,
        content,
        createdBy,
        isReminder: isReminder || false,
        reminderDate: isReminder ? reminderDate : null,
      });

      return { status: 201, success: true, data: newNote };
    } catch (error) {
      return { status: 500, success: false, message: error.message };
    }
  },

  // Get all notes for a specific user
  getUserNotes: async (data) => {
    try {
      const { id } = data;
      console.log(id);
      const notes = await Note.find({ userId: id }).sort({ createdAt: -1 });
      console.log(notes);
      res.json(notes);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  // Get all active reminders (for dashboard)
  getActiveReminders: async () => {
    try {
      const reminders = await Note.find({
        isReminder: true,
        reminderStatus: { $in: ["pending", "overdue"] },
      }).sort({ reminderDate: 1 });

      if (!reminders || reminders.length === 0) {
        return {
          status: 404,
          success: false,
          message: "No active reminders found",
        };
      }

      return { status: 200, success: true, data: reminders };
    } catch (error) {
      return { status: 500, success: false, message: error.message };
    }
  },

  // Update a note (mainly for content updates)
  updateNote: async (data) => {
    try {
      const { id, content } = data;

      const updatedNote = await Note.findByIdAndUpdate(
        id,
        { content },
        { new: true }
      );

      if (!updatedNote) {
        return { status: 404, success: false, message: "Note not found" };
      }

      return { status: 200, success: true, data: updatedNote };
    } catch (error) {
      return { status: 500, success: false, message: error.message };
    }
  },

  // Mark reminder as completed
  completeReminder: async (data) => {
    try {
      const { takenBy, id, actionNotes } = data;

      const updatedNote = await Note.findByIdAndUpdate(
        id,
        {
          reminderStatus: "completed",
          $push: {
            followUpActions: {
              action: "completed",
              takenBy,
              date: new Date(),
              notes: actionNotes,
            },
          },
        },
        { new: true }
      );

      if (!updatedNote) {
        return { status: 404, success: false, message: "Note not found" };
      }

      return { status: 200, success: true, data: updatedNote };
    } catch (error) {
      return { status: 500, success: false, message: error.message };
    }
  },

  // Snooze a reminder
  snoozeReminder: async (data) => {
    try {
      const { id, takenBy, newDate, reason } = data;

      if (!validateReminderDate(newDate)) {
        return res.status(400).json({ message: "Invalid new reminder date" });
      }

      const updatedNote = await Note.findByIdAndUpdate(
        id,
        {
          reminderStatus: "pending",
          reminderDate: newDate,
          $push: {
            followUpActions: {
              action: "snoozed",
              takenBy,
              date: new Date(),
              notes: reason,
            },
          },
        },
        { new: true }
      );

      if (!updatedNote) {
        return { status: 404, success: false, message: "Note not found" };
      }

      return { status: 200, success: true, data: updatedNote };
    } catch (error) {
      return { status: 500, success: false, message: error.message };
    }
  },

  // Delete a note
  deleteNote: async (data) => {
    try {
      const { id } = data;
      const deletedNote = await Note.findByIdAndDelete(id);

      if (!deletedNote) {
        return { status: 404, success: false, message: "Note not found" };
      }

      return {
        status: 200,
        success: true,
        message: "Note deleted successfully",
      };
    } catch (error) {
      return { status: 500, success: false, message: error.message };
    }
  },

  // Daily cron job to mark overdue reminders (for admin/scheduled tasks)
  markOverdueReminders: async () => {
    try {
      const result = await Note.updateMany({
        isReminder: true,
        reminderStatus: "pending",
        reminderDate: { $lte: new Date() },
      });

      res.json({
        message: `${result.modifiedCount} reminders marked as overdue`,
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },
};
