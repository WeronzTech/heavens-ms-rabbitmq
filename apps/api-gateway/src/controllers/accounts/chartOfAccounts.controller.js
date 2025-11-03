import { sendRPCRequest } from "../../../../../libs/common/rabbitMq.js";
import { ACCOUNTS_PATTERN } from "../../../../../libs/patterns/accounts/accounts.pattern.js";

const handleRPC = async (res, pattern, data) => {
  try {
    const response = await sendRPCRequest(pattern, data);
    return res.status(response.status || 500).json(response);
  } catch (error) {
    console.error(`API Gateway Error in ${pattern}:`, error);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
};

// --- Category (Account Head) ---

export const createAccountCategory = (req, res) => {
  return handleRPC(
    res,
    ACCOUNTS_PATTERN.CHART_OF_ACCOUNTS.CATEGORY_CREATE,
    req.body
  );
};

export const getAccountCategories = (req, res) => {
  return handleRPC(
    res,
    ACCOUNTS_PATTERN.CHART_OF_ACCOUNTS.CATEGORY_GET_ALL,
    req.query
  );
};

export const updateAccountCategory = (req, res) => {
  return handleRPC(res, ACCOUNTS_PATTERN.CHART_OF_ACCOUNTS.CATEGORY_UPDATE, {
    categoryId: req.params.id,
    ...req.body,
  });
};

export const deleteAccountCategory = (req, res) => {
  return handleRPC(res, ACCOUNTS_PATTERN.CHART_OF_ACCOUNTS.CATEGORY_DELETE, {
    categoryId: req.params.id,
  });
};

// --- Account (Ledger) ---

export const createAccount = (req, res) => {
  return handleRPC(
    res,
    ACCOUNTS_PATTERN.CHART_OF_ACCOUNTS.ACCOUNT_CREATE,
    req.body
  );
};

export const getAccounts = (req, res) => {
  return handleRPC(
    res,
    ACCOUNTS_PATTERN.CHART_OF_ACCOUNTS.ACCOUNT_GET_ALL,
    req.query
  );
};

export const getAccountById = (req, res) => {
  return handleRPC(res, ACCOUNTS_PATTERN.CHART_OF_ACCOUNTS.ACCOUNT_GET_BY_ID, {
    accountId: req.params.id,
  });
};

export const updateAccount = (req, res) => {
  return handleRPC(res, ACCOUNTS_PATTERN.CHART_OF_ACCOUNTS.ACCOUNT_UPDATE, {
    accountId: req.params.id,
    ...req.body,
  });
};

export const deleteAccount = (req, res) => {
  return handleRPC(res, ACCOUNTS_PATTERN.CHART_OF_ACCOUNTS.ACCOUNT_DELETE, {
    accountId: req.params.id,
    moveToAccountId: req.body.moveToAccountId, // Send the replacement ID in the body
  });
};
