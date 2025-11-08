import { Router } from "express";
import { isAuthenticated } from "../../middleware/isAuthenticated.js";
import { hasPermission } from "../../middleware/hasPermission.js";
import { PERMISSIONS } from "../../../../../libs/common/permissions.list.js";
import {
  createAdminManualJournalEntry,
  getAllJournalEntries,
  getJournalEntryById,
} from "../../controllers/accounts/accounting.controller.js";

const accountingRoutes = Router();

accountingRoutes.use(isAuthenticated);
accountingRoutes.use(hasPermission(PERMISSIONS.ACCOUNTS_MANAGE)); // Protect routes

// Route for manual journal entries
accountingRoutes.post("/journal-entry", createAdminManualJournalEntry);
accountingRoutes.get("/", getAllJournalEntries);
accountingRoutes.get("/:ledgerId", getJournalEntryById);

// You can add routes for managing ChartOfAccounts here
// e.g., GET /chart-of-accounts, POST /chart-of-accounts, etc.

export default accountingRoutes;
