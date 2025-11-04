import mongoose from "mongoose";
import { Schema, model } from "mongoose";

/*
-----------------------------------------------------------------
1. CONFIGURATION
-----------------------------------------------------------------
*/
// ⬇️⬇️⬇️ PASTE YOUR ACCOUNTS DATABASE CONNECTION STRING HERE ⬇️⬇️⬇️
const MONGO_URI =
  "mongodb+srv://weronztech:YOsHNIqznJgGcnRX@cluster0.degplel.mongodb.net/accountsDB?retryWrites=true&w=majority";
// ⬆️⬆️⬆️ PASTE YOUR ACCOUNTS DATABASE CONNECTION STRING HERE ⬆️⬆️⬆️

/*
-----------------------------------------------------------------
2. DEFINE SCHEMAS (Copied from your models)
-----------------------------------------------------------------
*/

const accountCategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    accountType: {
      type: String,
      required: true,
      enum: ["Asset", "Liability", "Equity", "Income", "Expense"],
    },
  },
  { timestamps: true }
);

const chartOfAccountSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    accountType: {
      type: String,
      required: true,
      enum: ["Asset", "Liability", "Equity", "Income", "Expense"],
      index: true,
    },
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: "AccountCategory",
      required: true,
      index: true,
    },
    balance: { type: Number, default: 0 },
    // ...other fields from your model...
  },
  { timestamps: true }
);

const AccountCategory = model("AccountCategory", accountCategorySchema);
const ChartOfAccount = model("ChartOfAccount", chartOfAccountSchema);

/*
-----------------------------------------------------------------
3. DATA TO SEED
-----------------------------------------------------------------
*/

const categories = [
  { name: "Current Assets", accountType: "Asset" },
  { name: "Fixed Assets", accountType: "Asset" },
  { name: "Current Liabilities", accountType: "Liability" },
  { name: "Operating Income", accountType: "Income" },
  { name: "Operating Expenses", accountType: "Expense" },
  { name: "Staff Expenses", accountType: "Expense" },
];

// This list matches your `accountMapping.config.js`
const accounts = [
  // Assets
  {
    name: "Bank Account",
    accountType: "Asset",
    categoryName: "Current Assets",
  },
  { name: "Petty Cash", accountType: "Asset", categoryName: "Current Assets" },
  { name: "Inventory", accountType: "Asset", categoryName: "Current Assets" },
  {
    name: "Salary Advances",
    accountType: "Asset",
    categoryName: "Current Assets",
  },
  {
    name: "Furniture & Fixtures",
    accountType: "Asset",
    categoryName: "Fixed Assets",
  },

  // Liabilities
  {
    name: "Security Deposits Liability",
    accountType: "Liability",
    categoryName: "Current Liabilities",
  },

  // Income
  {
    name: "Rent Income",
    accountType: "Income",
    categoryName: "Operating Income",
  },
  {
    name: "Deposit Income (Non-Refundable)",
    accountType: "Income",
    categoryName: "Operating Income",
  },

  // Expenses
  {
    name: "Salaries & Wages",
    accountType: "Expense",
    categoryName: "Staff Expenses",
  },
  {
    name: "Commission Expense",
    accountType: "Expense",
    categoryName: "Operating Expenses",
  },
  {
    name: "Maintenance Expense",
    accountType: "Expense",
    categoryName: "Operating Expenses",
  },
  {
    name: "Mess Supplies Expense",
    accountType: "Expense",
    categoryName: "Operating Expenses",
  },
  {
    name: "Utilities Expense",
    accountType: "Expense",
    categoryName: "Operating Expenses",
  },
  {
    name: "General Expense",
    accountType: "Expense",
    categoryName: "Operating Expenses",
  },
];

/*
-----------------------------------------------------------------
4. SEEDER FUNCTION
-----------------------------------------------------------------
*/
const seedDatabase = async () => {
  if (MONGO_URI === "YOUR_ACCOUNTS_DB_CONNECTION_STRING_HERE") {
    console.error(
      "❌ ERROR: Please paste your ACCOUNTS_MONGO_URI into the script."
    );
    return;
  }

  try {
    console.log("Connecting to Accounts database...");
    await mongoose.connect(MONGO_URI);
    console.log("✅ Database connected.");

    // 1. Seed Categories
    console.log("Seeding Account Categories...");
    try {
      await AccountCategory.insertMany(categories, { ordered: false });
      console.log("✅ Categories seeded successfully (ignored duplicates).");
    } catch (error) {
      if (error.code === 11000) {
        console.log("ℹ️  Categories already exist, skipping.");
      } else {
        throw error;
      }
    }

    // 2. Get Category IDs
    const categoryDocs = await AccountCategory.find().lean();
    const categoryMap = new Map(categoryDocs.map((cat) => [cat.name, cat._id]));

    // 3. Prepare Accounts with Category IDs
    const accountsToInsert = accounts
      .map((acc) => {
        const categoryId = categoryMap.get(acc.categoryName);
        if (!categoryId) {
          console.warn(
            `⚠️ Warning: Category "${acc.categoryName}" not found for account "${acc.name}".`
          );
          return null;
        }
        return {
          name: acc.name,
          accountType: acc.accountType,
          categoryId: categoryId,
        };
      })
      .filter(Boolean); // Filter out any nulls

    // 4. Seed Accounts
    console.log("Seeding Chart of Accounts...");
    try {
      await ChartOfAccount.insertMany(accountsToInsert, { ordered: false });
      console.log(
        "✅ Chart of Accounts seeded successfully (ignored duplicates)."
      );
    } catch (error) {
      if (error.code === 11000) {
        console.log("ℹ️  Accounts already exist, skipping.");
      } else {
        throw error;
      }
    }

    console.log("🎉 Seeding complete!");
  } catch (error) {
    console.error("❌ An error occurred during seeding:", error.message);
  } finally {
    await mongoose.disconnect();
    console.log("Database disconnected.");
  }
};

seedDatabase();
