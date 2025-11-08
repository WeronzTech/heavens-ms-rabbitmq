import { sendRPCRequest } from "../../../../../libs/common/rabbitMq.js";
import { ACCOUNTS_PATTERN } from "../../../../../libs/patterns/accounts/accounts.pattern.js";

const handleRPCAndRespond = async (res, pattern, data) => {
  try {
    const response = await sendRPCRequest(pattern, data);
    return res.status(response.status || 500).json(response);
  } catch (error) {
    console.error(`API Gateway Error in ${pattern}:`, error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error in API Gateway.",
    });
  }
};

// This controller might be expanded to manage ChartOfAccounts later
export const createManualJournalEntry = (req, res) => {
  return handleRPCAndRespond(
    res,
    ACCOUNTS_PATTERN.ACCOUNTING.CREATE_JOURNAL_ENTRY,
    req.body
  );
};

export const createAdminManualJournalEntry = (req, res) => {
  const entryData = {
    ...req.body,
    performedBy: req.userName || req.userAuth, // Get admin name from auth
  };
  return handleRPCAndRespond(
    res,
    ACCOUNTS_PATTERN.ACCOUNTING.CREATE_MANUAL_JOURNAL_ENTRY,
    entryData
  );
};

export const getAllJournalEntries = (req, res) => {
  const filters = {
    ...req.query,
  };
  console.log(filters);
  return handleRPCAndRespond(
    res,
    ACCOUNTS_PATTERN.ACCOUNTING.GET_JOURNAL_ENTRIES,
    { filters }
  );
};

export const getJournalEntryById = (req, res) => {
  const ledgerId = req.params.ledgerId;
  console.log(ledgerId);
  return handleRPCAndRespond(
    res,
    ACCOUNTS_PATTERN.ACCOUNTING.GET_JOURNAL_ENTRY_ID,
    { ledgerId }
  );
};
