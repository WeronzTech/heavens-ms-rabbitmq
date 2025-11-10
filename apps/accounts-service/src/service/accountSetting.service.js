import AccountSetting from "../models/accountSetting.model.js";
import ChartOfAccount from "../models/chartOfAccounts.model.js";
import { ACCOUNT_SYSTEM_NAMES } from "../config/accountMapping.config.js";

// A simple in-memory cache to avoid hitting the DB for the same mapping repeatedly.
const accountCache = new Map();

/**
 * Dynamically fetches the _id of an account from the AccountSetting mapping
 * based on its permanent systemName.
 *
 * @param {string} systemName - The system name from ACCOUNT_SYSTEM_NAMES (e.g., "CORE_BANK_ACCOUNT")
 * @returns {Promise<string>} - The mongoose.Types.ObjectId as a string.
 * @throws {Error} - If the account is not found or not mapped.
 */
export const getAccountId = async (systemName) => {
  // 1. Check cache first
  if (accountCache.has(systemName)) {
    return accountCache.get(systemName);
  }

  // 2. Not in cache, fetch from DB
  const setting = await AccountSetting.findOne({ systemName })
    .select("accountId")
    .lean();

  if (!setting || !setting.accountId) {
    console.error(
      `CRITICAL ACCOUNTING ERROR: Account for system name "${systemName}" is not mapped. Please set it in the admin panel.`
    );
    // In production, you might want to alert an admin here
    throw new Error(
      `Accounting setup error: Please map an account to "${systemName}".`
    );
  }

  const accountId = setting.accountId.toString();

  // 3. Store in cache for next time
  accountCache.set(systemName, accountId);

  return accountId;
};

/**
 * Clears the account ID cache.
 * Call this via an RPC pattern when an admin updates a mapping.
 */
export const clearAccountCache = () => {
  accountCache.clear();
  console.log("[AccountSetting] Cache cleared.");
  return { success: true, message: "Account mapping cache cleared." };
};

/**
 * Sets or updates an account mapping. (For Admin Panel)
 * @param {string} systemName - The system name to map (e.g., "INCOME_RENT_MONTHLY").
 * @param {string} accountId - The _id of the account from ChartOfAccount.
 * @param {string} updatedBy - The admin user's name or ID.
 */
export const setAccountMapping = async ({
  systemName,
  accountId,
  updatedBy,
}) => {
  if (!systemName || !accountId) {
    return {
      success: false,
      status: 400,
      message: "systemName and accountId are required.",
    };
  }

  // 1. Validate that the account exists
  const account = await ChartOfAccount.findById(accountId).lean();
  if (!account) {
    return {
      success: false,
      status: 404,
      message: "The selected account does not exist.",
    };
  }

  if (!Object.values(ACCOUNT_SYSTEM_NAMES).includes(systemName)) {
    return {
      success: false,
      status: 400,
      message: "Invalid systemName.",
    };
  }

  // 2. Find existing setting or create a new one
  const updatedSetting = await AccountSetting.findOneAndUpdate(
    { systemName },
    { $set: { accountId, lastUpdatedBy: updatedBy } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  // 3. Clear the cache so the change takes effect immediately
  clearAccountCache();

  return {
    success: true,
    status: 200,
    message: `Mapping for ${systemName} updated successfully.`,
    data: updatedSetting,
  };
};

/**
 * Gets all current account mappings. (For Admin Panel)
 */
export const getAccountMappings = async () => {
  const settings = await AccountSetting.find()
    .populate("accountId", "name accountType") // Populate the account details
    .lean();

  const mappedNames = new Set(settings.map((s) => s.systemName));
  const allNames = Object.values(ACCOUNT_SYSTEM_NAMES);

  allNames.forEach((name) => {
    if (!mappedNames.has(name)) {
      settings.push({
        systemName: name,
        accountId: null,
        description: "Not yet mapped by admin.",
      });
    }
  });

  return { success: true, status: 200, data: settings };
};

/**
 * Gets all available system names from the config file. (For Admin Panel)
 */
export const getAvailableSystemNames = async () => {
  // This just reads the config file and returns the keys.
  const allNames = Object.values(ACCOUNT_SYSTEM_NAMES);
  return { success: true, status: 200, data: allNames };
};
