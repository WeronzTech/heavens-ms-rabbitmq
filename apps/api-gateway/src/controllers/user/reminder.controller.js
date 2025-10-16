import { sendRPCRequest } from "../../../../../libs/common/rabbitMq.js";
import { USER_PATTERN } from "../../../../../libs/patterns/user/user.pattern.js";

export const createNote = async (req, res) => {
  try {
    const {
      userId,
      name,
      content,
      isReminder,
      reminderDate,
      createdBy,
      propertyId,
    } = req.body;

    const response = await sendRPCRequest(
      USER_PATTERN.REMINDER_NOTE.CREATE_NOTE,
      {
        createdBy,
        userId,
        name,
        content,
        isReminder,
        reminderDate,
        propertyId,
      }
    );

    return res
      .status(response?.status || 500)
      .json(response || { error: "Invalid RPC response" });
  } catch (error) {
    console.error("[API-GATEWAY] createNote error:", error);
    return res.status(500).json({ error: "Failed to create note" });
  }
};

export const getUserNotes = async (req, res) => {
  try {
    const { id } = req.params;

    const response = await sendRPCRequest(
      USER_PATTERN.REMINDER_NOTE.GET_USER_NOTES,
      { id }
    );

    return res
      .status(response?.status || 500)
      .json(response || { error: "Invalid RPC response" });
  } catch (error) {
    console.error("[API-GATEWAY] getUserNotes error:", error);
    return res.status(500).json({ error: "Failed to fetch user notes" });
  }
};

export const getActiveReminders = async (req, res) => {
  try {
    const { propertyId } = req.query;

    const response = await sendRPCRequest(
      USER_PATTERN.REMINDER_NOTE.GET_ACTIVE_REMINDERS,
      { propertyId }
    );

    return res
      .status(response?.status || 500)
      .json(response || { error: "Invalid RPC response" });
  } catch (error) {
    console.error("[API-GATEWAY] getActiveReminders error:", error);
    return res.status(500).json({ error: "Failed to fetch reminders" });
  }
};

export const updateNoteController = async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    const response = await sendRPCRequest(
      USER_PATTERN.REMINDER_NOTE.UPDATE_NOTE,
      {
        id,
        content,
      }
    );

    return res
      .status(response?.status || 500)
      .json(response || { error: "Invalid RPC response" });
  } catch (error) {
    console.error("[API-GATEWAY] updateNote error:", error);
    return res.status(500).json({ error: "Failed to update note" });
  }
};

export const completeReminder = async (req, res) => {
  try {
    const { id } = req.params;
    const { takenBy, actionNotes } = req.body;

    const response = await sendRPCRequest(
      USER_PATTERN.REMINDER_NOTE.COMPLETE_REMINDER,
      {
        id,
        takenBy,
        actionNotes,
      }
    );

    return res
      .status(response?.status || 500)
      .json(response || { error: "Invalid RPC response" });
  } catch (error) {
    console.error("[API-GATEWAY] completeReminder error:", error);
    return res.status(500).json({ error: "Failed to complete reminder" });
  }
};

export const snoozeReminder = async (req, res) => {
  try {
    const { id } = req.params;
    const { takenBy, newDate, reason } = req.body;

    const response = await sendRPCRequest(
      USER_PATTERN.REMINDER_NOTE.SNOOZE_REMINDER,
      {
        id,
        takenBy,
        newDate,
        reason,
      }
    );

    return res
      .status(response?.status || 500)
      .json(response || { error: "Invalid RPC response" });
  } catch (error) {
    console.error("[API-GATEWAY] snoozeReminder error:", error);
    return res.status(500).json({ error: "Failed to snooze reminder" });
  }
};

export const deleteNote = async (req, res) => {
  try {
    const { id } = req.params;

    const response = await sendRPCRequest(
      USER_PATTERN.REMINDER_NOTE.DELETE_NOTE,
      { id }
    );

    return res
      .status(response?.status || 500)
      .json(response || { error: "Invalid RPC response" });
  } catch (error) {
    console.error("[API-GATEWAY] deleteNote error:", error);
    return res.status(500).json({ error: "Failed to delete note" });
  }
};
