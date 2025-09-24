import { createResponder } from "../../../../libs/common/rabbitMq.js";
import { USER_PATTERN } from "../../../../libs/patterns/user/user.pattern.js";
import { noteController } from "../services/reminderNote.service.js";

createResponder(USER_PATTERN.REMINDER_NOTE.CREATE_NOTE, async (data) => {
  return await noteController.createNote(data);
});

createResponder(USER_PATTERN.REMINDER_NOTE.GET_USER_NOTES, async (data) => {
  return await noteController.getUserNotes(data);
});

createResponder(
  USER_PATTERN.REMINDER_NOTE.GET_ACTIVE_REMINDERS,
  async (data) => {
    return await noteController.getActiveReminders(data);
  }
);

createResponder(USER_PATTERN.REMINDER_NOTE.UPDATE_NOTE, async (data) => {
  return await noteController.updateNote(data);
});

createResponder(USER_PATTERN.REMINDER_NOTE.COMPLETE_REMINDER, async (data) => {
  return await noteController.completeReminder(data);
});

createResponder(USER_PATTERN.REMINDER_NOTE.SNOOZE_REMINDER, async (data) => {
  return await noteController.snoozeReminder(data);
});

createResponder(USER_PATTERN.REMINDER_NOTE.DELETE_NOTE, async (data) => {
  return await noteController.deleteNote(data);
});
