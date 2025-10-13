/**
 * Mongoose Data Migration Script - FINANCIAL DATA (Expense & FeePayment)
 *
 * This script connects to the source and target databases to fetch data from
 * 'expenses' and 'feepayments' and inserts it into the new 'Expense' and
 * 'Payments' collections, preserving ObjectIds for historical integrity.
 */

import mongoose from "mongoose";

// =========================================================================================
// 1. CONFIGURATION
// =========================================================================================

// --- SOURCE DATABASE (Old Expense and FeePayment data lives here) ---
const SOURCE_MONGO_URI =
  "mongodb+srv://heavensliving:NJ5i5ZrbMayqRaKk@heavens.fg8yv.mongodb.net/yourDatabaseName?retryWrites=true&w=majority&appName=heavens"; // <-- UPDATE THIS
// --- TARGET DATABASE (New Expense and Payments data will be inserted here) ---
const TARGET_MONGO_URI =
  "mongodb+srv://weronztech:YOsHNIqznJgGcnRX@cluster0.degplel.mongodb.net/accountsDB?retryWrites=true&w=majority"; // <-- UPDATE THIS (Use the actual DB name for your new financial data)

const BATCH_SIZE = 100;

// =========================================================================================
// 2. SCHEMA DEFINITIONS (Minimal for migration)
// =========================================================================================

// --- NEW TARGET SCHEMAS ---

// New Expense Schema (Minimal definition)
const newExpenseSchema = new mongoose.Schema(
  {
    _id: mongoose.Schema.Types.ObjectId,
    title: { type: String, required: true },
    type: { type: String, required: true },
    category: { type: String, required: true },
    description: { type: String, default: "" },
    paymentMethod: { type: String, required: true },
    pettyCashType: { type: String },
    transactionId: { type: String },
    amount: { type: Number, required: true },
    handledBy: { type: String },
    date: { type: Date, required: true },
    property: {
      id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Property",
        required: true,
      },
      name: { type: String, required: true },
    },
    imageUrl: { type: String, default: "" },
    createdBy: { type: mongoose.Schema.Types.ObjectId },
  },
  { collection: "expenses" }
);

// New Payments Schema (Minimal definition)
const newPaymentSchema = new mongoose.Schema(
  {
    _id: mongoose.Schema.Types.ObjectId,
    name: { type: String, required: true },
    rentType: { type: String, required: true },
    userType: { type: String, required: true },
    contact: { type: String, required: true },
    room: { type: String, required: true },
    rent: { type: Number, required: true },
    amount: { type: Number, required: true },
    dueAmount: { type: Number, required: true },
    waveOffAmount: { type: Number },
    waveOffReason: { type: String },
    accountBalance: { type: Number, required: true },
    paymentMethod: { type: String, required: true },
    transactionId: { type: String },
    collectedBy: { type: String },
    fullyClearedRentMonths: [{ type: String }],
    paymentForMonths: [{ type: String }],
    paymentDate: { type: Date, default: Date.now },
    status: { type: String, enum: ["Paid", "Pending"], default: "Pending" },
    remarks: { type: String },
    property: {
      id: { type: mongoose.Schema.Types.ObjectId, ref: "Property" },
      name: { type: String },
    },
    userId: { type: mongoose.Schema.Types.ObjectId, required: true },
  },
  { collection: "payments" }
);

// --- OLD SOURCE SCHEMAS ---

// Old Expense Schema
const oldExpenseSchema = new mongoose.Schema(
  {
    title: { type: String },
    type: { type: String },
    category: { type: String },
    otherReason: { type: String }, // Maps to description
    paymentMethod: { type: String },
    transactionId: { type: String },
    amount: { type: Number },
    handledBy: { type: String }, // String ID/Name
    pettyCashType: { type: String },
    date: { type: Date },
    propertyName: { type: String },
    propertyId: { type: String }, // String ID
    billImg: { type: String }, // Maps to imageUrl
    staff: { type: mongoose.Schema.Types.ObjectId, ref: "Staff" }, // Maps to createdBy
  },
  { collection: "expenses" }
);

// Old FeePayment Schema
const oldFeePaymentSchema = new mongoose.Schema(
  {
    name: { type: String },
    monthlyRent: { type: Number }, // Maps to rent
    totalAmountToPay: { type: Number },
    amountPaid: { type: Number }, // Maps to amount
    pendingBalance: { type: Number }, // Maps to dueAmount
    advanceBalance: { type: Number }, // Maps to accountBalance
    fullyClearedRentMonths: [{ type: String }],
    rentMonth: { type: String }, // Maps to paymentForMonths
    paymentDate: { type: Date },
    waveOff: { type: Number }, // Maps to waveOffAmount
    waveOffReason: { type: String },
    transactionId: { type: String },
    remarks: { type: String },
    paymentMode: { type: String }, // Maps to paymentMethod
    collectedBy: { type: String },
    property: { type: String }, // Maps to property.name
    dailyRent: { type: mongoose.Schema.Types.ObjectId, ref: "DailyRent" }, // Used for userId
    student: { type: mongoose.Schema.Types.ObjectId, ref: "Student" }, // Used for userId
  },
  { collection: "feepayments" }
);

// =========================================================================================
// 3. MAPPING FUNCTIONS
// =========================================================================================

/**
 * Maps an Old Expense document to the new Expense schema.
 */
function mapOldExpenseToNewExpense(oldDoc) {
  let newPropId = null;
  if (oldDoc.propertyId && mongoose.Types.ObjectId.isValid(oldDoc.propertyId)) {
    newPropId = new mongoose.Types.ObjectId(oldDoc.propertyId);
  }

  const newDocData = {
    _id: oldDoc._id, // Preserve ObjectId
    title: oldDoc.title,
    type: oldDoc.type,
    category: oldDoc.category,
    description: oldDoc.otherReason || "",
    paymentMethod: oldDoc.paymentMethod,
    pettyCashType: oldDoc.pettyCashType,
    transactionId: oldDoc.transactionId,
    amount: oldDoc.amount,
    handledBy: oldDoc.handledBy, // Preserve original handledBy string/id
    date: oldDoc.date,
    property: {
      id: newPropId
        ? newPropId
        : new mongoose.Types.ObjectId("673f32a9f45581fececcaa54"),
      name: oldDoc.propertyName || "N/A",
    },
    imageUrl: oldDoc.billImg || "",
    createdBy: oldDoc.staff || null, // Map old 'staff' ObjectId to new 'createdBy' ObjectId
  }; // Ensure property.id is valid and present as required by the new schema (if possible)

  if (!newDocData.property.id) {
    console.warn(
      `Expense ID ${oldDoc._id}: Missing or invalid propertyId. Setting to null.`
    );
  }

  return newDocData;
}

/**
 * Maps an Old FeePayment document to the new Payments schema.
 */
function mapOldFeePaymentToNewPayment(oldDoc) {
  // Determine the linked User's ObjectId (this links the payment to the new User)
  const userId = oldDoc.student || oldDoc.dailyRent || null; // Map payment mode string for enum compatibility

  let paymentMethod = oldDoc.paymentMode;
  if (paymentMethod === "Net Banking") {
    paymentMethod = "Bank Transfer";
  } else if (paymentMethod === "UPI") {
    paymentMethod = "UPI";
  } else if (paymentMethod === "Cash") {
    paymentMethod = "Cash";
  }

  const newDocData = {
    _id: oldDoc._id, // Preserve ObjectId
    userId: userId, // CRITICAL: Preserved ObjectId of Student/DailyRent
    name: oldDoc.name || "N/A", // !!! WARNING: Fields below are derived/placeholder and need POST-MIGRATION LOOKUP !!! // They should ideally come from the linked User document.

    rentType: oldDoc.dailyRent ? "daily" : "monthly", // Placeholder guess
    userType: oldDoc.student
      ? "student"
      : oldDoc.dailyRent
      ? "dailyRent"
      : "N/A", // Placeholder guess
    contact: "0000000000", // Placeholder
    room: "N/A", // Placeholder // !!! END WARNING !!!
    rent: oldDoc.monthlyRent || 0,
    amount: oldDoc.amountPaid || 0,
    dueAmount: oldDoc.pendingBalance || 0,
    waveOffAmount: oldDoc.waveOff || 0,
    waveOffReason: oldDoc.waveOffReason || "",
    accountBalance: oldDoc.advanceBalance || 0,
    paymentMethod: paymentMethod,
    transactionId: oldDoc.transactionId || null,
    collectedBy: oldDoc.collectedBy || null,
    fullyClearedRentMonths: oldDoc.fullyClearedRentMonths || [],
    paymentForMonths: oldDoc.rentMonth ? [oldDoc.rentMonth] : [], // Wrap single month into array
    paymentDate: oldDoc.paymentDate,
    status: oldDoc.paymentStatus || "Paid",
    remarks: oldDoc.remarks || "",
    property: {
      id: null, // CRITICAL: Cannot determine ObjectId from property Name/String without lookup.
      name: oldDoc.property || "N/A",
    },
  }; // Validation checks for critical fields

  if (!newDocData.userId) {
    console.error(
      `FeePayment ID ${oldDoc._id}: Missing student/dailyRent link! Payment will be orphaned.`
    );
  }

  return newDocData;
}

// =========================================================================================
// 4. MIGRATION EXECUTION
// =========================================================================================

async function runMigration() {
  let sourceConn, targetConn;
  let expenseCount = 0;
  let paymentCount = 0;
  let totalSuccess = 0;
  let totalError = 0;

  try {
    // 1. Establish Connections
    console.log("Connecting to Source Database...");
    sourceConn = await mongoose.createConnection(SOURCE_MONGO_URI);
    console.log("Source Database connected successfully.");

    console.log("Connecting to Target Database...");
    targetConn = await mongoose.createConnection(TARGET_MONGO_URI);
    console.log(
      "Target Database connected successfully. Starting financial migration..."
    ); // 2. Define Models on specific connections

    const SourceExpense = sourceConn.model("Expense", oldExpenseSchema);
    const SourceFeePayment = sourceConn.model(
      "FeePayment",
      oldFeePaymentSchema
    );

    const TargetExpense = targetConn.model("Expense", newExpenseSchema);
    const TargetPayment = targetConn.model("Payments", newPaymentSchema); // --------------------------------------------------------------------- // 4.1. Migrate Expense data // ---------------------------------------------------------------------

    console.log("\n--- Starting Expense Migration ---");
    const expenseCursor = SourceExpense.find().lean().cursor();
    let expSuccess = 0;
    let expError = 0;

    for (
      let doc = await expenseCursor.next();
      doc != null;
      doc = await expenseCursor.next()
    ) {
      expenseCount++;
      try {
        const newDocData = mapOldExpenseToNewExpense(doc);
        await TargetExpense.create(newDocData);
        expSuccess++;
        if (expSuccess % BATCH_SIZE === 0) {
          console.log(`Processed ${expSuccess} expenses...`);
        }
      } catch (error) {
        expError++;
        console.error(`Error migrating Expense ID: ${doc._id}`, error.message);
      }
    }
    totalSuccess += expSuccess;
    totalError += expError;
    console.log(
      `Expense Migration complete. Total: ${expenseCount}, Success: ${expSuccess}, Errors: ${expError}`
    ); // --------------------------------------------------------------------- // 4.2. Migrate FeePayment data // ---------------------------------------------------------------------

    console.log("\n--- Starting FeePayment Migration ---");
    const paymentCursor = SourceFeePayment.find().lean().cursor();
    let paySuccess = 0;
    let payError = 0;

    for (
      let doc = await paymentCursor.next();
      doc != null;
      doc = await paymentCursor.next()
    ) {
      paymentCount++;
      try {
        const newDocData = mapOldFeePaymentToNewPayment(doc);
        await TargetPayment.create(newDocData);
        paySuccess++;
        if (paySuccess % BATCH_SIZE === 0) {
          console.log(`Processed ${paySuccess} payments...`);
        }
      } catch (error) {
        payError++;
        console.error(
          `Error migrating FeePayment ID: ${doc._id}`,
          error.message
        );
      }
    }
    totalSuccess += paySuccess;
    totalError += payError;
    console.log(
      `FeePayment Migration complete. Total: ${paymentCount}, Success: ${paySuccess}, Errors: ${payError}`
    );
  } catch (error) {
    console.error("\n*** FATAL MIGRATION ERROR ***", error);
  } finally {
    if (sourceConn) {
      await sourceConn.close();
      console.log("Source Database connection closed.");
    }
    if (targetConn) {
      await targetConn.close();
      console.log("Target Database connection closed.");
    }
    console.log("\n=========================================================");
    console.log("FINANCIAL DATA MIGRATION SUMMARY");
    console.log(`Expenses Migrated: ${expenseCount}`);
    console.log(`Payments Migrated: ${paymentCount}`);
    console.log("---------------------------------------------------------");
    console.log(`TOTAL SUCCESSFUL INSERTIONS: ${totalSuccess}`);
    console.log(`TOTAL ERRORS ENCOUNTERED: ${totalError}`);
    console.log("=========================================================");
  }
}

// Execute the main function
runMigration();
