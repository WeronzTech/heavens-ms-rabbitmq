import Note from "../models/reminderNote.modal.js";
import User from "../models/user.model.js";

// Helper function to validate reminder dates
const validateReminderDate = (date) => {
  if (!date) return false;
  return new Date(date) > new Date();
};

export const noteController = {
  // Create a new note (with or without reminder)
  createNote: async (req, res) => {
    try {
      const {userId, content, isReminder, reminderDate} = req.body;
      const createdBy = req.headers["x-user-id"];
      console.log(req.body);
      // Validate user exists
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({message: "User not found"});
      }

      // Validate reminder date if it's a reminder
      if (isReminder && !validateReminderDate(reminderDate)) {
        return res.status(400).json({message: "Invalid reminder date"});
      }

      const newNote = await Note.create({
        userId,
        content,
        createdBy,
        isReminder: isReminder || false,
        reminderDate: isReminder ? reminderDate : null,
      });

      res.status(201).json(newNote);
    } catch (error) {
      res.status(500).json({message: error.message});
    }
  },

  // Get all notes for a specific user
  getUserNotes: async (req, res) => {
    try {
      const {id} = req.params;
      console.log(id);
      const notes = await Note.find({userId: id}).sort({createdAt: -1});
      console.log(notes);
      res.json(notes);
    } catch (error) {
      res.status(500).json({message: error.message});
    }
  },

  // Get all active reminders (for dashboard)
  getActiveReminders: async (req, res) => {
    try {
      const reminders = await Note.find({
        isReminder: true,
        reminderStatus: {$in: ["pending", "overdue"]},
      }).sort({reminderDate: 1});

      res.json(reminders);
    } catch (error) {
      res.status(500).json({message: error.message});
    }
  },

  // Update a note (mainly for content updates)
  updateNote: async (req, res) => {
    try {
      const {id} = req.params;
      const {content} = req.body;

      const updatedNote = await Note.findByIdAndUpdate(
        id,
        {content},
        {new: true}
      );

      if (!updatedNote) {
        return res.status(404).json({message: "Note not found"});
      }

      res.json(updatedNote);
    } catch (error) {
      res.status(500).json({message: error.message});
    }
  },

  // Mark reminder as completed
  completeReminder: async (req, res) => {
    try {
      const {id} = req.params;
      const {actionNotes} = req.body;
      const takenBy = req.headers["x-user-id"];

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
        {new: true}
      );

      if (!updatedNote) {
        return res.status(404).json({message: "Note not found"});
      }

      res.json(updatedNote);
    } catch (error) {
      res.status(500).json({message: error.message});
    }
  },

  // Snooze a reminder
  snoozeReminder: async (req, res) => {
    try {
      const {id} = req.params;
      const {newDate, reason} = req.body;
      const takenBy = req.headers["x-user-id"];

      if (!validateReminderDate(newDate)) {
        return res.status(400).json({message: "Invalid new reminder date"});
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
        {new: true}
      );

      if (!updatedNote) {
        return res.status(404).json({message: "Note not found"});
      }

      res.json(updatedNote);
    } catch (error) {
      res.status(500).json({message: error.message});
    }
  },

  // Delete a note
  deleteNote: async (req, res) => {
    try {
      const {id} = req.params;
      const deletedNote = await Note.findByIdAndDelete(id);

      if (!deletedNote) {
        return res.status(404).json({message: "Note not found"});
      }

      res.json({message: "Note deleted successfully"});
    } catch (error) {
      res.status(500).json({message: error.message});
    }
  },

  // Daily cron job to mark overdue reminders (for admin/scheduled tasks)
  markOverdueReminders: async (req, res) => {
    try {
      const result = await Note.updateMany({
        isReminder: true,
        reminderStatus: "pending",
        reminderDate: {$lte: new Date()},
      });

      res.json({
        message: `${result.modifiedCount} reminders marked as overdue`,
      });
    } catch (error) {
      res.status(500).json({message: error.message});
    }
  },
};
