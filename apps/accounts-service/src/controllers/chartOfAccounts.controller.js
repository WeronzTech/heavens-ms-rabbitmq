import { createResponder } from "../../../../libs/common/rabbitMq.js";
import { ACCOUNTS_PATTERN } from "../../../../libs/patterns/accounts/accounts.pattern.js";
import {
  createAccountCategory,
  getAccountCategories,
  updateAccountCategory,
  deleteAccountCategory,
  createAccount,
  getAccounts,
  getAccountById,
  updateAccount,
  deleteAccount,
} from "../service/chartOfAccounts.service.js";

// --- Category Responders ---

createResponder(
  ACCOUNTS_PATTERN.CHART_OF_ACCOUNTS.CATEGORY_CREATE,
  async (data) => {
    return await createAccountCategory(data);
  }
);

createResponder(
  ACCOUNTS_PATTERN.CHART_OF_ACCOUNTS.CATEGORY_GET_ALL,
  async (filters) => {
    return await getAccountCategories(filters);
  }
);

createResponder(
  ACCOUNTS_PATTERN.CHART_OF_ACCOUNTS.CATEGORY_UPDATE,
  async (data) => {
    const { categoryId, ...updateData } = data;
    return await updateAccountCategory(categoryId, updateData);
  }
);

createResponder(
  ACCOUNTS_PATTERN.CHART_OF_ACCOUNTS.CATEGORY_DELETE,
  async (data) => {
    return await deleteAccountCategory(data.categoryId);
  }
);

// --- Account (Ledger) Responders ---

createResponder(
  ACCOUNTS_PATTERN.CHART_OF_ACCOUNTS.ACCOUNT_CREATE,
  async (data) => {
    return await createAccount(data);
  }
);

createResponder(
  ACCOUNTS_PATTERN.CHART_OF_ACCOUNTS.ACCOUNT_GET_ALL,
  async (filters) => {
    return await getAccounts(filters);
  }
);

createResponder(
  ACCOUNTS_PATTERN.CHART_OF_ACCOUNTS.ACCOUNT_GET_BY_ID,
  async (data) => {
    return await getAccountById(data.accountId);
  }
);

createResponder(
  ACCOUNTS_PATTERN.CHART_OF_ACCOUNTS.ACCOUNT_UPDATE,
  async (data) => {
    const { accountId, ...updateData } = data;
    return await updateAccount(accountId, updateData);
  }
);

createResponder(
  ACCOUNTS_PATTERN.CHART_OF_ACCOUNTS.ACCOUNT_DELETE,
  async (data) => {
    const { accountId, moveToAccountId } = data;
    return await deleteAccount(accountId, moveToAccountId);
  }
);
