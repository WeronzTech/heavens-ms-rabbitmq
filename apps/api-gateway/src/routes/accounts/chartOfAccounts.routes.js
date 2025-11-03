import { Router } from "express";
import { isAuthenticated } from "../../middleware/isAuthenticated.js";
import { hasPermission } from "../../middleware/hasPermission.js";
import { PERMISSIONS } from "../../../../../libs/common/permissions.list.js";
import {
  createAccount,
  createAccountCategory,
  deleteAccount,
  deleteAccountCategory,
  getAccountById,
  getAccountCategories,
  getAccounts,
  updateAccount,
  updateAccountCategory,
} from "../../controllers/accounts/chartOfAccounts.controller.js";

const coaRoutes = Router();

coaRoutes.use(isAuthenticated);

// --- Category (Account Head) Routes ---
coaRoutes.post(
  "/category",
  hasPermission(PERMISSIONS.ACCOUNTS_MANAGE),
  createAccountCategory
);
coaRoutes.get(
  "/category",
  hasPermission(PERMISSIONS.ACCOUNTS_VIEW),
  getAccountCategories
);
coaRoutes.put(
  "/category/:id",
  hasPermission(PERMISSIONS.ACCOUNTS_MANAGE),
  updateAccountCategory
);
coaRoutes.delete(
  "/category/:id",
  hasPermission(PERMISSIONS.ACCOUNTS_MANAGE),
  deleteAccountCategory
);

// --- Account (Ledger) Routes ---
coaRoutes.post(
  "/account",
  hasPermission(PERMISSIONS.ACCOUNTS_MANAGE),
  createAccount
);
coaRoutes.get(
  "/account",
  hasPermission(PERMISSIONS.ACCOUNTS_VIEW),
  getAccounts
);
coaRoutes.get(
  "/account/:id",
  hasPermission(PERMISSIONS.ACCOUNTS_VIEW),
  getAccountById
);
coaRoutes.put(
  "/account/:id",
  hasPermission(PERMISSIONS.ACCOUNTS_MANAGE),
  updateAccount
);
coaRoutes.delete(
  "/account/:id",
  hasPermission(PERMISSIONS.ACCOUNTS_MANAGE),
  deleteAccount // Body must contain { moveToAccountId: "..." } if transactions exist
);

export default coaRoutes;
