import { createResponder } from "../../../../libs/common/rabbitMq.js";
import { ACCOUNTS_PATTERN } from "../../../../libs/patterns/accounts/accounts.pattern.js";
import {
  createJournalEntry,
  createManualJournalEntry,
} from "../service/accounting.service.js";

createResponder(
  ACCOUNTS_PATTERN.ACCOUNTING.CREATE_JOURNAL_ENTRY,
  async (data) => {
    try {
      // This is an RPC call, so it won't have a session from another service.
      // We create a new session here to ensure the journal entry itself is atomic.
      await createJournalEntry(data);
      return { success: true, status: 201, message: "Journal entry created." };
    } catch (error) {
      console.error(
        "[Accounting Controller] Error creating journal entry via RPC:",
        error
      );
      return { success: false, status: 500, message: error.message };
    }
  }
);

createResponder(
  ACCOUNTS_PATTERN.ACCOUNTING.CREATE_MANUAL_JOURNAL_ENTRY,
  async (data) => {
    // We expect 'performedBy' (admin name/ID) to be in the data
    return await createManualJournalEntry(data);
  }
);
