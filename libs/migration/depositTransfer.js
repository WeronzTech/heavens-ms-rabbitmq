/**
 * Mongoose Data Migration - FEE PAYMENTS (DEPOSITS) TO DEPOSITS
 * * Logic:
 * 1. Fetch 'feepayments' where { isDepositPayment: true }
 * 2. Resolve Property Name -> New Property ID.
 * 3. Use contact directly from the fee payment document.
 * 4. Insert into 'deposits'.
 */

import mongoose from "mongoose";
import crypto from "crypto";

// =========================================================================================
// 1. CONFIGURATION
// =========================================================================================

// --- TOGGLE THIS FOR DRY RUN ---
const DRY_RUN = false; // Set to TRUE to log only, set to FALSE to save to DB

// --- DATABASE CONNECTION URIS ---
const SOURCE_MONGO_URI =
  "mongodb+srv://heavensliving:NJ5i5ZrbMayqRaKk@heavens.fg8yv.mongodb.net/yourDatabaseName?retryWrites=true&w=majority&appName=heavens";
const TARGET_MONGO_URI =
  "mongodb+srv://weronztech:YOsHNIqznJgGcnRX@cluster0.degplel.mongodb.net/accountsDB?retryWrites=true&w=majority";

const BATCH_SIZE = 50;

// --- PROPERTY MAPPING ---
const PROPERTY_MAP = {
  "flora inn": { id: "673f32a9f45581fececcaa54", name: "Flora Inn" },
  "flora inn - 2": { id: "673f32a9f45581fececcaa54", name: "Flora Inn" },
  "bloom inn": { id: "67b6dde721a6cf4b96f79781", name: "Bloom Inn" },
  "heritage inn": { id: "68b7d175b258b16689a68b6c", name: "Heritage Inn" },
};

// =========================================================================================
// 2. HELPER FUNCTIONS
// =========================================================================================

function resolveProperty(oldPropertyName) {
  if (!oldPropertyName) return null;
  const cleanName = oldPropertyName.toLowerCase().trim();
  return PROPERTY_MAP[cleanName] || null;
}

function normalizePaymentMethod(mode) {
  if (!mode) return "Cash";
  const m = mode.toLowerCase();
  if (m.includes("upi") || m.includes("gpay") || m.includes("phonepe"))
    return "UPI";
  if (m.includes("bank") || m.includes("transfer")) return "Bank Transfer";
  if (m.includes("card")) return "Card";
  return "Cash";
}

function generateReceiptNumber() {
  return "RCP-MIG-" + crypto.randomBytes(4).toString("hex").toUpperCase();
}

// =========================================================================================
// 3. SCHEMA DEFINITIONS
// =========================================================================================

// --- SOURCE: Old Fee Payment (Added contact fields here) ---
const oldFeePaymentSchema = new mongoose.Schema(
  {
    name: String,
    amountPaid: Number,
    paymentDate: Date,
    transactionId: String,
    remarks: String,
    paymentMode: String,
    collectedBy: String,
    property: String,
    isDepositPayment: Boolean,
    student: mongoose.Schema.Types.ObjectId,
    dailyRent: mongoose.Schema.Types.ObjectId,

    // Attempting to read contact from here
    contact: String,
    contactNo: String,
  },
  { collection: "feepayments" },
);

// --- TARGET: New Deposit Schema ---
const depositSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    userType: { type: String, enum: ["student", "worker"], required: true },
    contact: { type: String, required: true },
    isRefund: { type: Boolean, default: false },

    // Payment Fields
    nonRefundableDeposit: { type: Number, default: 0 },
    refundableDeposit: { type: Number, default: 0 },
    refundablePaidNow: { type: Number, default: 0 },
    nonRefundablePaidNow: { type: Number, default: 0 },
    amountPaid: { type: Number, default: 0 },
    dueAmount: { type: Number, default: 0 },
    paymentMethod: {
      type: String,
      enum: ["Cash", "UPI", "Bank Transfer", "Card", "Razorpay"],
    },
    transactionId: { type: String, sparse: true },
    collectedBy: String,
    paymentDate: { type: Date, default: Date.now },
    status: { type: String, default: "Paid" },

    // Links
    userId: { type: mongoose.Schema.Types.ObjectId, required: true },
    property: { type: mongoose.Schema.Types.ObjectId, required: true },
    propertyName: String,
    receiptNumber: { type: String, required: true, unique: true },
    remarks: String,
  },
  { timestamps: true },
);

// =========================================================================================
// 4. MIGRATION EXECUTION
// =========================================================================================

async function runMigration() {
  let sourceConn, targetConn;
  let processedCount = 0;
  let successCount = 0;
  let errorCount = 0;

  try {
    console.log(`\n==============================================`);
    console.log(
      `MODE: ${DRY_RUN ? "DRY RUN (Read Only)" : "LIVE EXECUTION (Writing to DB)"}`,
    );
    console.log(`==============================================\n`);

    // 1. Establish Connections
    console.log("Connecting to Source Database...");
    sourceConn = await mongoose.createConnection(SOURCE_MONGO_URI);

    console.log("Connecting to Target Database...");
    targetConn = await mongoose.createConnection(TARGET_MONGO_URI);

    // 2. Define Models
    const SourceFee = sourceConn.model("FeePayment", oldFeePaymentSchema);
    const TargetDeposit = targetConn.model("Deposits", depositSchema);

    // 3. Start Migration
    console.log("\n--- Fetching Deposit Payments ---");

    const cursor = SourceFee.find({ isDepositPayment: true }).lean().cursor();

    for (
      let doc = await cursor.next();
      doc != null;
      doc = await cursor.next()
    ) {
      processedCount++;
      try {
        // A. Resolve Property
        const propData = resolveProperty(doc.property);
        if (!propData) {
          throw new Error(`Property not found in map: "${doc.property}"`);
        }

        // B. Resolve User Link (Student vs Worker)
        // If neither exists, we skip or flag, but we assume one exists for a valid payment.
        let userId = doc.student || doc.dailyRent;
        let userType = doc.dailyRent ? "worker" : "student";

        if (!userId) {
          throw new Error("No Student or DailyRent ID linked to payment");
        }

        // C. Map Data
        // Use contact or contactNo from the fee payment doc itself
        const contactInfo = doc.contact || doc.contactNo || "0000000000";

        const newDeposit = {
          name: doc.name || "Unknown",
          userType: userType,
          contact: contactInfo,
          isRefund: false,

          amountPaid: doc.amountPaid || 0,
          refundableDeposit: doc.amountPaid || 0,
          refundablePaidNow: doc.amountPaid || 0,
          nonRefundableDeposit: 0,
          nonRefundablePaidNow: 0,
          dueAmount: 0,

          paymentMethod: normalizePaymentMethod(doc.paymentMode),
          transactionId:
            doc.transactionId ||
            `TRX-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          collectedBy: doc.collectedBy,
          paymentDate: doc.paymentDate || new Date(),
          status: "Paid",

          userId: userId,
          property: propData.id,
          propertyName: propData.name,
          receiptNumber: generateReceiptNumber(),
          remarks: doc.remarks,
        };

        // D. Save
        if (DRY_RUN) {
          console.log(
            `[DRY RUN] Would Insert: ${newDeposit.name} | Amt: ${newDeposit.amountPaid} | Prop: ${newDeposit.propertyName} | Contact: ${newDeposit.contact}`,
          );
        } else {
          await TargetDeposit.create(newDeposit);
        }

        successCount++;
        if (successCount % BATCH_SIZE === 0)
          console.log(`Processed ${successCount} records...`);
      } catch (error) {
        errorCount++;
        console.error(`[ERROR] Doc ID ${doc._id}: ${error.message}`);
      }
    }

    console.log(`\n==============================================`);
    console.log(`MIGRATION SUMMARY`);
    console.log(`Total Found: ${processedCount}`);
    console.log(`Success: ${successCount}`);
    console.log(`Errors: ${errorCount}`);
    console.log(`==============================================`);
  } catch (error) {
    console.error("\n*** FATAL ERROR ***", error);
  } finally {
    if (sourceConn) await sourceConn.close();
    if (targetConn) await targetConn.close();
  }
}

runMigration();
