// /**
//  * Mongoose Data Migration Script - FINANCIAL DATA (Expense & FeePayment)
//  *
//  * This script connects to the source and target databases to fetch data from
//  * 'expenses' and 'feepayments' and inserts it into the new 'Expense' and
//  * 'Payments' collections, preserving ObjectIds for historical integrity.
//  */

// import mongoose from "mongoose";

// // =========================================================================================
// // 1. CONFIGURATION
// // =========================================================================================

// // --- SOURCE DATABASE (Old Expense and FeePayment data lives here) ---
// const SOURCE_MONGO_URI =
//   "mongodb+srv://heavensliving:NJ5i5ZrbMayqRaKk@heavens.fg8yv.mongodb.net/yourDatabaseName?retryWrites=true&w=majority&appName=heavens"; // <-- UPDATE THIS
// // --- TARGET DATABASE (New Expense and Payments data will be inserted here) ---
// const TARGET_MONGO_URI =
//   "mongodb+srv://weronztech:YOsHNIqznJgGcnRX@cluster0.degplel.mongodb.net/accountsDB?retryWrites=true&w=majority"; // <-- UPDATE THIS (Use the actual DB name for your new financial data)

// const BATCH_SIZE = 100;

// // =========================================================================================
// // 2. SCHEMA DEFINITIONS (Minimal for migration)
// // =========================================================================================

// // --- NEW TARGET SCHEMAS ---

// // New Expense Schema (Minimal definition)
// const newExpenseSchema = new mongoose.Schema(
//   {
//     _id: mongoose.Schema.Types.ObjectId,
//     title: { type: String, required: true },
//     type: { type: String, required: true },
//     category: { type: String, required: true },
//     description: { type: String, default: "" },
//     paymentMethod: { type: String, required: true },
//     pettyCashType: { type: String },
//     transactionId: { type: String },
//     amount: { type: Number, required: true },
//     handledBy: { type: String },
//     date: { type: Date, required: true },
//     property: {
//       id: {
//         type: mongoose.Schema.Types.ObjectId,
//         ref: "Property",
//         required: true,
//       },
//       name: { type: String, required: true },
//     },
//     imageUrl: { type: String, default: "" },
//     createdBy: { type: mongoose.Schema.Types.ObjectId },
//   },
//   { collection: "expenses" }
// );

// // New Payments Schema (Minimal definition)
// const newPaymentSchema = new mongoose.Schema(
//   {
//     _id: mongoose.Schema.Types.ObjectId,
//     name: { type: String, required: true },
//     rentType: { type: String, required: true },
//     userType: { type: String, required: true },
//     contact: { type: String, required: true },
//     room: { type: String, required: true },
//     rent: { type: Number, required: true },
//     amount: { type: Number, required: true },
//     dueAmount: { type: Number, required: true },
//     waveOffAmount: { type: Number },
//     waveOffReason: { type: String },
//     accountBalance: { type: Number, required: true },
//     paymentMethod: { type: String, required: true },
//     transactionId: { type: String },
//     collectedBy: { type: String },
//     fullyClearedRentMonths: [{ type: String }],
//     paymentForMonths: [{ type: String }],
//     paymentDate: { type: Date, default: Date.now },
//     status: { type: String, enum: ["Paid", "Pending"], default: "Pending" },
//     remarks: { type: String },
//     property: {
//       id: { type: mongoose.Schema.Types.ObjectId, ref: "Property" },
//       name: { type: String },
//     },
//     userId: { type: mongoose.Schema.Types.ObjectId, required: true },
//   },
//   { collection: "payments" }
// );

// // --- OLD SOURCE SCHEMAS ---

// // Old Expense Schema
// const oldExpenseSchema = new mongoose.Schema(
//   {
//     title: { type: String },
//     type: { type: String },
//     category: { type: String },
//     otherReason: { type: String }, // Maps to description
//     paymentMethod: { type: String },
//     transactionId: { type: String },
//     amount: { type: Number },
//     handledBy: { type: String }, // String ID/Name
//     pettyCashType: { type: String },
//     date: { type: Date },
//     propertyName: { type: String },
//     propertyId: { type: String }, // String ID
//     billImg: { type: String }, // Maps to imageUrl
//     staff: { type: mongoose.Schema.Types.ObjectId, ref: "Staff" }, // Maps to createdBy
//   },
//   { collection: "expenses" }
// );

// // Old FeePayment Schema
// const oldFeePaymentSchema = new mongoose.Schema(
//   {
//     name: { type: String },
//     monthlyRent: { type: Number }, // Maps to rent
//     totalAmountToPay: { type: Number },
//     amountPaid: { type: Number }, // Maps to amount
//     pendingBalance: { type: Number }, // Maps to dueAmount
//     advanceBalance: { type: Number }, // Maps to accountBalance
//     fullyClearedRentMonths: [{ type: String }],
//     rentMonth: { type: String }, // Maps to paymentForMonths
//     paymentDate: { type: Date },
//     waveOff: { type: Number }, // Maps to waveOffAmount
//     waveOffReason: { type: String },
//     transactionId: { type: String },
//     remarks: { type: String },
//     paymentMode: { type: String }, // Maps to paymentMethod
//     collectedBy: { type: String },
//     property: { type: String }, // Maps to property.name
//     dailyRent: { type: mongoose.Schema.Types.ObjectId, ref: "DailyRent" }, // Used for userId
//     student: { type: mongoose.Schema.Types.ObjectId, ref: "Student" }, // Used for userId
//   },
//   { collection: "feepayments" }
// );

// // =========================================================================================
// // 3. MAPPING FUNCTIONS
// // =========================================================================================

// /**
//  * Maps an Old Expense document to the new Expense schema.
//  */
// function mapOldExpenseToNewExpense(oldDoc) {
//   let newPropId = null;
//   if (oldDoc.propertyId && mongoose.Types.ObjectId.isValid(oldDoc.propertyId)) {
//     newPropId = new mongoose.Types.ObjectId(oldDoc.propertyId);
//   }

//   const newDocData = {
//     _id: oldDoc._id, // Preserve ObjectId
//     title: oldDoc.title,
//     type: oldDoc.type,
//     category: oldDoc.category,
//     description: oldDoc.otherReason || "",
//     paymentMethod: oldDoc.paymentMethod,
//     pettyCashType: oldDoc.pettyCashType,
//     transactionId: oldDoc.transactionId,
//     amount: oldDoc.amount,
//     handledBy: oldDoc.handledBy, // Preserve original handledBy string/id
//     date: oldDoc.date,
//     property: {
//       id: newPropId
//         ? newPropId
//         : new mongoose.Types.ObjectId("673f32a9f45581fececcaa54"),
//       name: oldDoc.propertyName || "N/A",
//     },
//     imageUrl: oldDoc.billImg || "",
//     createdBy: oldDoc.staff || null, // Map old 'staff' ObjectId to new 'createdBy' ObjectId
//   }; // Ensure property.id is valid and present as required by the new schema (if possible)

//   if (!newDocData.property.id) {
//     console.warn(
//       `Expense ID ${oldDoc._id}: Missing or invalid propertyId. Setting to null.`
//     );
//   }

//   return newDocData;
// }

// /**
//  * Maps an Old FeePayment document to the new Payments schema.
//  */
// function mapOldFeePaymentToNewPayment(oldDoc) {
//   // Determine the linked User's ObjectId (this links the payment to the new User)
//   const userId = oldDoc.student || oldDoc.dailyRent || null; // Map payment mode string for enum compatibility

//   let paymentMethod = oldDoc.paymentMode;
//   if (paymentMethod === "Net Banking") {
//     paymentMethod = "Bank Transfer";
//   } else if (paymentMethod === "UPI") {
//     paymentMethod = "UPI";
//   } else if (paymentMethod === "Cash") {
//     paymentMethod = "Cash";
//   }

//   const newDocData = {
//     _id: oldDoc._id, // Preserve ObjectId
//     userId: userId, // CRITICAL: Preserved ObjectId of Student/DailyRent
//     name: oldDoc.name || "N/A", // !!! WARNING: Fields below are derived/placeholder and need POST-MIGRATION LOOKUP !!! // They should ideally come from the linked User document.

//     rentType: oldDoc.dailyRent ? "daily" : "monthly", // Placeholder guess
//     userType: oldDoc.student
//       ? "student"
//       : oldDoc.dailyRent
//       ? "dailyRent"
//       : "N/A", // Placeholder guess
//     contact: "0000000000", // Placeholder
//     room: "N/A", // Placeholder // !!! END WARNING !!!
//     rent: oldDoc.monthlyRent || 0,
//     amount: oldDoc.amountPaid || 0,
//     dueAmount: oldDoc.pendingBalance || 0,
//     waveOffAmount: oldDoc.waveOff || 0,
//     waveOffReason: oldDoc.waveOffReason || "",
//     accountBalance: oldDoc.advanceBalance || 0,
//     paymentMethod: paymentMethod,
//     transactionId: oldDoc.transactionId || null,
//     collectedBy: oldDoc.collectedBy || null,
//     fullyClearedRentMonths: oldDoc.fullyClearedRentMonths || [],
//     paymentForMonths: oldDoc.rentMonth ? [oldDoc.rentMonth] : [], // Wrap single month into array
//     paymentDate: oldDoc.paymentDate,
//     status: oldDoc.paymentStatus || "Paid",
//     remarks: oldDoc.remarks || "",
//     property: {
//       id: null, // CRITICAL: Cannot determine ObjectId from property Name/String without lookup.
//       name: oldDoc.property || "N/A",
//     },
//   }; // Validation checks for critical fields

//   if (!newDocData.userId) {
//     console.error(
//       `FeePayment ID ${oldDoc._id}: Missing student/dailyRent link! Payment will be orphaned.`
//     );
//   }

//   return newDocData;
// }

// // =========================================================================================
// // 4. MIGRATION EXECUTION
// // =========================================================================================

// async function runMigration() {
//   let sourceConn, targetConn;
//   let expenseCount = 0;
//   let paymentCount = 0;
//   let totalSuccess = 0;
//   let totalError = 0;

//   try {
//     // 1. Establish Connections
//     console.log("Connecting to Source Database...");
//     sourceConn = await mongoose.createConnection(SOURCE_MONGO_URI);
//     console.log("Source Database connected successfully.");

//     console.log("Connecting to Target Database...");
//     targetConn = await mongoose.createConnection(TARGET_MONGO_URI);
//     console.log(
//       "Target Database connected successfully. Starting financial migration..."
//     ); // 2. Define Models on specific connections

//     const SourceExpense = sourceConn.model("Expense", oldExpenseSchema);
//     const SourceFeePayment = sourceConn.model(
//       "FeePayment",
//       oldFeePaymentSchema
//     );

//     const TargetExpense = targetConn.model("Expense", newExpenseSchema);
//     const TargetPayment = targetConn.model("Payments", newPaymentSchema); // --------------------------------------------------------------------- // 4.1. Migrate Expense data // ---------------------------------------------------------------------

//     console.log("\n--- Starting Expense Migration ---");
//     const expenseCursor = SourceExpense.find().lean().cursor();
//     let expSuccess = 0;
//     let expError = 0;

//     for (
//       let doc = await expenseCursor.next();
//       doc != null;
//       doc = await expenseCursor.next()
//     ) {
//       expenseCount++;
//       try {
//         const newDocData = mapOldExpenseToNewExpense(doc);
//         await TargetExpense.create(newDocData);
//         expSuccess++;
//         if (expSuccess % BATCH_SIZE === 0) {
//           console.log(`Processed ${expSuccess} expenses...`);
//         }
//       } catch (error) {
//         expError++;
//         console.error(`Error migrating Expense ID: ${doc._id}`, error.message);
//       }
//     }
//     totalSuccess += expSuccess;
//     totalError += expError;
//     console.log(
//       `Expense Migration complete. Total: ${expenseCount}, Success: ${expSuccess}, Errors: ${expError}`
//     ); // --------------------------------------------------------------------- // 4.2. Migrate FeePayment data // ---------------------------------------------------------------------

//     console.log("\n--- Starting FeePayment Migration ---");
//     const paymentCursor = SourceFeePayment.find().lean().cursor();
//     let paySuccess = 0;
//     let payError = 0;

//     for (
//       let doc = await paymentCursor.next();
//       doc != null;
//       doc = await paymentCursor.next()
//     ) {
//       paymentCount++;
//       try {
//         const newDocData = mapOldFeePaymentToNewPayment(doc);
//         await TargetPayment.create(newDocData);
//         paySuccess++;
//         if (paySuccess % BATCH_SIZE === 0) {
//           console.log(`Processed ${paySuccess} payments...`);
//         }
//       } catch (error) {
//         payError++;
//         console.error(
//           `Error migrating FeePayment ID: ${doc._id}`,
//           error.message
//         );
//       }
//     }
//     totalSuccess += paySuccess;
//     totalError += payError;
//     console.log(
//       `FeePayment Migration complete. Total: ${paymentCount}, Success: ${paySuccess}, Errors: ${payError}`
//     );
//   } catch (error) {
//     console.error("\n*** FATAL MIGRATION ERROR ***", error);
//   } finally {
//     if (sourceConn) {
//       await sourceConn.close();
//       console.log("Source Database connection closed.");
//     }
//     if (targetConn) {
//       await targetConn.close();
//       console.log("Target Database connection closed.");
//     }
//     console.log("\n=========================================================");
//     console.log("FINANCIAL DATA MIGRATION SUMMARY");
//     console.log(`Expenses Migrated: ${expenseCount}`);
//     console.log(`Payments Migrated: ${paymentCount}`);
//     console.log("---------------------------------------------------------");
//     console.log(`TOTAL SUCCESSFUL INSERTIONS: ${totalSuccess}`);
//     console.log(`TOTAL ERRORS ENCOUNTERED: ${totalError}`);
//     console.log("=========================================================");
//   }
// }

// // Execute the main function
// runMigration();
/**
 * Mongoose Data Migration Script - FINANCIAL DATA (Expense & FeePayment)
 *
 * This script connects to the source and target databases to fetch data from
 * 'expenses' and 'feepayments' and inserts it into the new 'Expense' and
 * 'Payments' collections.
 */

// import mongoose from "mongoose";
// import { v4 as uuidv4 } from "uuid";

// // =========================================================================================
// // 1. CONFIGURATION
// // =========================================================================================

// // --- SOURCE DATABASE (Old Expense and FeePayment data lives here) ---
// const SOURCE_MONGO_URI =
//   "mongodb+srv://heavensliving:NJ5i5ZrbMayqRaKk@heavens.fg8yv.mongodb.net/yourDatabaseName?retryWrites=true&w=majority&appName=heavens"; // <-- UPDATE THIS
// // --- TARGET DATABASE (New Expense and Payments data will be inserted here) ---
// const TARGET_MONGO_URI =
//   "mongodb+srv://weronztech:YOsHNIqznJgGcnRX@cluster0.degplel.mongodb.net/accountsDB?retryWrites=true&w=majority"; // <-- UPDATE THIS

// const BATCH_SIZE = 100;

// // =========================================================================================
// // 2. SCHEMA DEFINITIONS (Updated to match uploaded models)
// // =========================================================================================

// // --- NEW TARGET SCHEMAS ---

// // New Expense Schema (Matches models/expense.model.js)
// const newExpenseSchema = new mongoose.Schema(
//   {
//     title: { type: String, required: true },
//     type: { type: String, required: true },
//     category: { type: String, required: true },
//     description: { type: String, default: "" },
//     paymentMethod: { type: String, required: true },
//     pettyCashType: {
//       type: String,
//       enum: ["inHand", "inAccount"],
//       required: function () {
//         return this.paymentMethod === "Petty Cash";
//       },
//     },
//     transactionId: { type: String, required: false },
//     amount: { type: Number, required: true },
//     handledBy: mongoose.Schema.Types.ObjectId, // Strict ObjectId in new model
//     date: { type: Date, required: true },
//     property: {
//       id: {
//         type: mongoose.Schema.Types.ObjectId,
//         ref: "Property",
//         required: true,
//       },
//       name: {
//         type: String,
//         required: true,
//       },
//       _id: false,
//     },
//     kitchenId: {
//       type: mongoose.Schema.Types.ObjectId,
//       required: false,
//     },
//     actionPerformedBy: { type: String, required: false },
//     createdBy: {
//       type: mongoose.Schema.Types.ObjectId,
//     },
//     imageUrl: {
//       type: String,
//       default: "",
//     },
//   },
//   { collection: "expenses" }
// );

// // New Payments Schema (Matches models/feePayments.model.js)
// const newPaymentSchema = new mongoose.Schema(
//   {
//     name: { type: String, required: true },
//     rentType: { type: String, required: true },
//     userType: { type: String, required: true },
//     contact: { type: String, required: true },
//     room: { type: String, required: true },
//     rent: { type: Number, required: true },
//     amount: { type: Number, required: true },
//     dueAmount: { type: Number, required: false },
//     waveOffAmount: { type: Number, required: false },
//     referralAmountUsed: { type: Number, required: false },
//     waveOffReason: { type: String, required: false },
//     accountBalance: { type: Number, required: true },
//     advanceApplied: { type: Number, default: 0 },
//     remainingBalance: { type: Number, default: 0 },
//     paymentMethod: {
//       type: String,
//       enum: ["Cash", "UPI", "Bank Transfer", "Card", "Razorpay"],
//       required: true,
//     },
//     transactionId: {
//       type: String,
//       required: function () {
//         return (
//           this.paymentMethod === "UPI" || this.paymentMethod === "Bank Transfer"
//         );
//       },
//       sparse: true,
//     },
//     collectedBy: { type: String, required: false },
//     fullyClearedRentMonths: [{ type: String, required: true }],
//     paymentForMonths: [{ type: String }],
//     advanceForMonths: [{ type: String }],
//     paymentDate: { type: Date, default: Date.now },
//     status: { type: String, enum: ["Paid", "Pending"], default: "Pending" },
//     remarks: { type: String },
//     property: {
//       id: {
//         type: mongoose.Schema.Types.ObjectId,
//         ref: "Property",
//         required: false,
//       },
//       name: {
//         type: String,
//         required: false,
//       },
//       _id: false,
//     },
//     receiptNumber: {
//       type: String,
//       required: true,
//       unique: true,
//     },
//     razorpayOrderId: { type: String },
//     razorpayPaymentId: { type: String },
//     razorpaySignature: { type: String },
//     clientId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "Client",
//       required: false,
//     },
//     userId: { type: mongoose.Schema.Types.ObjectId, required: true },
//   },
//   { collection: "payments" }
// );

// // --- OLD SOURCE SCHEMAS ---

// // Old Expense Schema
// const oldExpenseSchema = new mongoose.Schema(
//   {
//     title: { type: String },
//     type: { type: String },
//     category: { type: String },
//     otherReason: { type: String }, // Maps to description
//     paymentMethod: { type: String },
//     transactionId: { type: String },
//     amount: { type: Number },
//     handledBy: { type: String }, // String ID/Name in old DB
//     pettyCashType: { type: String },
//     date: { type: Date },
//     propertyName: { type: String },
//     propertyId: { type: String }, // String ID
//     billImg: { type: String }, // Maps to imageUrl
//     staff: { type: mongoose.Schema.Types.ObjectId, ref: "Staff" }, // Maps to createdBy
//   },
//   { collection: "expenses" }
// );

// // Old FeePayment Schema
// const oldFeePaymentSchema = new mongoose.Schema(
//   {
//     name: { type: String },
//     monthlyRent: { type: Number },
//     totalAmountToPay: { type: Number },
//     amountPaid: { type: Number },
//     pendingBalance: { type: Number },
//     advanceBalance: { type: Number },
//     fullyClearedRentMonths: [{ type: String }],
//     rentMonth: { type: String },
//     paymentDate: { type: Date },
//     waveOff: { type: Number },
//     waveOffReason: { type: String },
//     transactionId: { type: String },
//     remarks: { type: String },
//     paymentMode: { type: String },
//     collectedBy: { type: String },
//     property: { type: String },
//     dailyRent: { type: mongoose.Schema.Types.ObjectId, ref: "DailyRent" },
//     student: { type: mongoose.Schema.Types.ObjectId, ref: "Student" },
//   },
//   { collection: "feepayments" }
// );

// // =========================================================================================
// // 3. MAPPING FUNCTIONS
// // =========================================================================================

// // Helper to generate a temporary receipt number for migrated data
// function generateReceiptNumber() {
//   const timestamp = Date.now().toString().slice(-6);
//   const random = Math.floor(1000 + Math.random() * 9000);
//   return `REC-MIG-${timestamp}-${random}`;
// }

// /**
//  * Maps an Old Expense document to the new Expense schema.
//  */
// function mapOldExpenseToNewExpense(oldDoc) {
//   let newPropId = new mongoose.Types.ObjectId("673f32a9f45581fececcaa54"); // Default Fallback

//   if (oldDoc.propertyId && mongoose.Types.ObjectId.isValid(oldDoc.propertyId)) {
//     newPropId = new mongoose.Types.ObjectId(oldDoc.propertyId);
//   }

//   // Handle 'handledBy': Old schema was String, new is ObjectId.
//   // If old is not a valid ObjectId, we must set to NULL to avoid cast error.
//   let validHandledBy = null;
//   if (oldDoc.handledBy && mongoose.Types.ObjectId.isValid(oldDoc.handledBy)) {
//     validHandledBy = new mongoose.Types.ObjectId(oldDoc.handledBy);
//   }

//   const newDocData = {
//     _id: oldDoc._id, // Preserve ObjectId
//     title: oldDoc.title || "Untitled Expense",
//     type: oldDoc.type || "Expense",
//     category: oldDoc.category || "General",
//     description: oldDoc.otherReason || "",
//     paymentMethod: oldDoc.paymentMethod || "Cash",
//     // pettyCashType only required if paymentMethod is Petty Cash.
//     // We strictly map only if it matches enum values.
//     pettyCashType:
//       oldDoc.pettyCashType === "inHand" || oldDoc.pettyCashType === "inAccount"
//         ? oldDoc.pettyCashType
//         : null,

//     transactionId: oldDoc.transactionId || null,
//     amount: oldDoc.amount || 0,
//     handledBy: validHandledBy,
//     date: oldDoc.date || new Date(),
//     property: {
//       id: newPropId,
//       name: oldDoc.propertyName || "N/A",
//     },
//     imageUrl: oldDoc.billImg || "",
//     createdBy: oldDoc.staff || null,
//     kitchenId: null, // New field
//     actionPerformedBy: null, // New field
//   };

//   return newDocData;
// }

// /**
//  * Maps an Old FeePayment document to the new Payments schema.
//  */
// function mapOldFeePaymentToNewPayment(oldDoc) {
//   const userId = oldDoc.student || oldDoc.dailyRent || null;

//   // Map payment mode string for enum compatibility
//   let paymentMethod = oldDoc.paymentMode;
//   if (paymentMethod === "Net Banking") paymentMethod = "Bank Transfer";
//   else if (paymentMethod === "UPI") paymentMethod = "UPI";
//   else if (paymentMethod === "Cash") paymentMethod = "Cash";
//   else paymentMethod = "Cash"; // Default fallback

//   const newDocData = {
//     _id: oldDoc._id,
//     userId: userId,
//     name: oldDoc.name || "N/A",

//     // --- Placeholders (Data needs to be populated from User link in a real scenario) ---
//     rentType: oldDoc.dailyRent ? "daily" : "monthly",
//     userType: oldDoc.student
//       ? "student"
//       : oldDoc.dailyRent
//       ? "dailyRent"
//       : "N/A",
//     contact: "0000000000",
//     room: "N/A",
//     // ---------------------------------------------------------------------------------

//     rent: oldDoc.monthlyRent || 0,
//     amount: oldDoc.amountPaid || 0,
//     dueAmount: oldDoc.pendingBalance || 0,
//     waveOffAmount: oldDoc.waveOff || 0,
//     waveOffReason: oldDoc.waveOffReason || "",
//     accountBalance: oldDoc.advanceBalance || 0,
//     referralAmountUsed: 0, // New field
//     advanceApplied: 0, // New field
//     remainingBalance: 0, // New field

//     paymentMethod: paymentMethod,
//     transactionId: oldDoc.transactionId || null,
//     collectedBy: oldDoc.collectedBy || null,

//     fullyClearedRentMonths: oldDoc.fullyClearedRentMonths || [],
//     paymentForMonths: oldDoc.rentMonth ? [oldDoc.rentMonth] : [],
//     advanceForMonths: [], // New field

//     paymentDate: oldDoc.paymentDate || new Date(),
//     status: "Paid", // Assuming migrated payments are paid
//     remarks: oldDoc.remarks || "",

//     property: {
//       id: null, // Cannot derive ID from just name without lookup
//       name: oldDoc.property || "N/A",
//     },

//     receiptNumber: generateReceiptNumber(), // Required unique field
//     razorpayOrderId: null,
//     razorpayPaymentId: null,
//     razorpaySignature: null,
//     clientId: null,
//   };

//   if (!newDocData.userId) {
//     console.warn(
//       `[WARN] FeePayment ID ${oldDoc._id}: Missing student/dailyRent link!`
//     );
//   }

//   return newDocData;
// }

// // =========================================================================================
// // 4. MIGRATION EXECUTION
// // =========================================================================================

// async function runMigration() {
//   let sourceConn, targetConn;
//   let expenseCount = 0;
//   let paymentCount = 0;
//   let totalSuccess = 0;
//   let totalError = 0;

//   try {
//     // 1. Establish Connections
//     console.log("Connecting to Source Database...");
//     sourceConn = await mongoose.createConnection(SOURCE_MONGO_URI);
//     console.log("Source Database connected successfully.");

//     console.log("Connecting to Target Database...");
//     targetConn = await mongoose.createConnection(TARGET_MONGO_URI);
//     console.log(
//       "Target Database connected successfully. Starting financial migration..."
//     );

//     // 2. Define Models
//     const SourceExpense = sourceConn.model("Expense", oldExpenseSchema);
//     const SourceFeePayment = sourceConn.model(
//       "FeePayment",
//       oldFeePaymentSchema
//     );

//     const TargetExpense = targetConn.model("Expense", newExpenseSchema);
//     const TargetPayment = targetConn.model("Payments", newPaymentSchema);

//     // ---------------------------------------------------------------------
//     // 4.1. Migrate Expense data
//     // ---------------------------------------------------------------------
//     console.log("\n--- Starting Expense Migration ---");
//     const expenseCursor = SourceExpense.find().lean().cursor();
//     let expSuccess = 0;
//     let expError = 0;

//     for (
//       let doc = await expenseCursor.next();
//       doc != null;
//       doc = await expenseCursor.next()
//     ) {
//       expenseCount++;
//       try {
//         const newDocData = mapOldExpenseToNewExpense(doc);

//         // *** TRIAL RUN: Commented out actual write ***
//         await TargetExpense.create(newDocData);
//         console.log(
//           `[TRIAL] Would insert Expense: ${newDocData.title} (${newDocData.amount})`
//         );

//         expSuccess++;
//         if (expSuccess % BATCH_SIZE === 0)
//           console.log(`Processed ${expSuccess} expenses...`);
//       } catch (error) {
//         expError++;
//         console.error(`Error migrating Expense ID: ${doc._id}`, error.message);
//       }
//     }
//     totalSuccess += expSuccess;
//     totalError += expError;
//     console.log(
//       `Expense Migration complete. Total: ${expenseCount}, Success: ${expSuccess}, Errors: ${expError}`
//     );

//     // ---------------------------------------------------------------------
//     // 4.2. Migrate FeePayment data
//     // ---------------------------------------------------------------------
//     console.log("\n--- Starting FeePayment Migration ---");
//     const paymentCursor = SourceFeePayment.find().lean().cursor();
//     let paySuccess = 0;
//     let payError = 0;

//     for (
//       let doc = await paymentCursor.next();
//       doc != null;
//       doc = await paymentCursor.next()
//     ) {
//       paymentCount++;
//       try {
//         const newDocData = mapOldFeePaymentToNewPayment(doc);

//         // *** TRIAL RUN: Commented out actual write ***
//         await TargetPayment.create(newDocData);
//         console.log(
//           `[TRIAL] Would insert Payment: ${newDocData.amount} for User ${newDocData.name} (Receipt: ${newDocData.receiptNumber})`
//         );

//         paySuccess++;
//         if (paySuccess % BATCH_SIZE === 0)
//           console.log(`Processed ${paySuccess} payments...`);
//       } catch (error) {
//         payError++;
//         console.error(
//           `Error migrating FeePayment ID: ${doc._id}`,
//           error.message
//         );
//       }
//     }
//     totalSuccess += paySuccess;
//     totalError += payError;
//     console.log(
//       `FeePayment Migration complete. Total: ${paymentCount}, Success: ${paySuccess}, Errors: ${payError}`
//     );
//   } catch (error) {
//     console.error("\n*** FATAL MIGRATION ERROR ***", error);
//   } finally {
//     if (sourceConn) {
//       await sourceConn.close();
//       console.log("Source Database connection closed.");
//     }
//     if (targetConn) {
//       await targetConn.close();
//       console.log("Target Database connection closed.");
//     }
//     console.log("\n=========================================================");
//     console.log(`TOTAL SUCCESSFUL INSERTIONS: ${totalSuccess}`);
//     console.log(`TOTAL ERRORS ENCOUNTERED: ${totalError}`);
//     console.log("=========================================================");
//   }
// }

// // Execute the main function
// runMigration();
import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

// =========================================================================================
// 1. CONFIGURATION
// =========================================================================================

// --- SOURCE DATABASE (Old Expense and FeePayment data lives here) ---
const SOURCE_MONGO_URI =
  "mongodb+srv://heavensliving:NJ5i5ZrbMayqRaKk@heavens.fg8yv.mongodb.net/yourDatabaseName?retryWrites=true&w=majority&appName=heavens"; // <-- UPDATE THIS
// --- TARGET DATABASE (New Expense and Payments data will be inserted here) ---
const TARGET_MONGO_URI =
  "mongodb+srv://weronztech:YOsHNIqznJgGcnRX@cluster0.degplel.mongodb.net/accountsDB?retryWrites=true&w=majority"; // <-- UPDATE THIS

const BATCH_SIZE = 100;

// =========================================================================================
// 2. SCHEMA DEFINITIONS
// =========================================================================================

// --- NEW TARGET SCHEMAS ---

// New Expense Schema (Matches models/expense.model.js)
const newExpenseSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    type: { type: String, required: true },
    category: { type: String, required: true },
    description: { type: String, default: "" },
    paymentMethod: { type: String, required: true },
    pettyCashType: {
      type: String,
      enum: ["inHand", "inAccount"],
      required: function () {
        return this.paymentMethod === "Petty Cash";
      },
    },
    transactionId: { type: String, required: false },
    amount: { type: Number, required: true },
    handledBy: mongoose.Schema.Types.ObjectId, // Strict ObjectId in new model
    date: { type: Date, required: true },
    property: {
      id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Property",
        required: true,
      },
      name: {
        type: String,
        required: true,
      },
      _id: false,
    },
    kitchenId: {
      type: mongoose.Schema.Types.ObjectId,
      required: false,
    },
    actionPerformedBy: { type: String, required: false },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
    },
    imageUrl: {
      type: String,
      default: "",
    },
  },
  { collection: "expenses" }
);

// New Payments Schema (Matches models/feePayments.model.js)
const newPaymentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    rentType: { type: String, required: true },
    userType: { type: String, required: true },
    contact: { type: String, required: true },
    room: { type: String, required: true },
    rent: { type: Number, required: true },
    amount: { type: Number, required: true },
    dueAmount: { type: Number, required: false },
    waveOffAmount: { type: Number, required: false },
    referralAmountUsed: { type: Number, required: false },
    waveOffReason: { type: String, required: false },
    accountBalance: { type: Number, required: true },
    advanceApplied: { type: Number, default: 0 },
    remainingBalance: { type: Number, default: 0 },
    paymentMethod: {
      type: String,
      enum: ["Cash", "UPI", "Bank Transfer", "Card", "Razorpay"],
      required: true,
    },
    transactionId: {
      type: String,
      required: function () {
        return (
          this.paymentMethod === "UPI" || this.paymentMethod === "Bank Transfer"
        );
      },
      sparse: true,
    },
    collectedBy: { type: String, required: false },
    fullyClearedRentMonths: [{ type: String, required: true }],
    paymentForMonths: [{ type: String }],
    advanceForMonths: [{ type: String }],
    paymentDate: { type: Date, default: Date.now },
    status: { type: String, enum: ["Paid", "Pending"], default: "Pending" },
    remarks: { type: String },
    property: {
      id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Property",
        required: false,
      },
      name: {
        type: String,
        required: false,
      },
      _id: false,
    },
    receiptNumber: {
      type: String,
      required: true,
      unique: true,
    },
    razorpayOrderId: { type: String },
    razorpayPaymentId: { type: String },
    razorpaySignature: { type: String },
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: false,
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
    handledBy: { type: String }, // String ID/Name in old DB
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
    monthlyRent: { type: Number },
    totalAmountToPay: { type: Number },
    amountPaid: { type: Number },
    pendingBalance: { type: Number },
    advanceBalance: { type: Number },
    fullyClearedRentMonths: [{ type: String }],
    rentMonth: { type: String },
    paymentDate: { type: Date },
    waveOff: { type: Number },
    waveOffReason: { type: String },
    transactionId: { type: String },
    remarks: { type: String },
    paymentMode: { type: String },
    collectedBy: { type: String },
    property: { type: String },
    dailyRent: { type: mongoose.Schema.Types.ObjectId, ref: "DailyRent" },
    student: { type: mongoose.Schema.Types.ObjectId, ref: "Student" },
  },
  { collection: "feepayments" }
);

// =========================================================================================
// 3. MAPPING FUNCTIONS
// =========================================================================================

// Helper to generate a temporary receipt number for migrated data
function generateReceiptNumber() {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(1000 + Math.random() * 9000);
  return `REC-MIG-${timestamp}-${random}`;
}

/**
 * Maps an Old Expense document to the new Expense schema.
 */
function mapOldExpenseToNewExpense(oldDoc) {
  let newPropId = new mongoose.Types.ObjectId("673f32a9f45581fececcaa54"); // Default Fallback

  if (oldDoc.propertyId && mongoose.Types.ObjectId.isValid(oldDoc.propertyId)) {
    newPropId = new mongoose.Types.ObjectId(oldDoc.propertyId);
  }

  // Handle 'handledBy': Old schema was String, new is ObjectId.
  // If old is not a valid ObjectId, we must set to NULL to avoid cast error.
  let validHandledBy = null;
  if (oldDoc.handledBy && mongoose.Types.ObjectId.isValid(oldDoc.handledBy)) {
    validHandledBy = new mongoose.Types.ObjectId(oldDoc.handledBy);
  }

  const newDocData = {
    _id: oldDoc._id, // Preserve ObjectId
    title: oldDoc.title || "Untitled Expense",
    type: oldDoc.type || "Expense",
    category: oldDoc.category || "General",
    description: oldDoc.otherReason || "",
    paymentMethod: oldDoc.paymentMethod || "Cash",
    // pettyCashType only required if paymentMethod is Petty Cash.
    // We strictly map only if it matches enum values.
    pettyCashType:
      oldDoc.paymentMethod === "Petty Cash" &&
      (oldDoc.pettyCashType === "inHand" ||
        oldDoc.pettyCashType === "inAccount")
        ? oldDoc.pettyCashType
        : oldDoc.paymentMethod === "Petty Cash"
        ? "inHand"
        : null,

    transactionId: oldDoc.transactionId || null,
    amount: oldDoc.amount || 0,
    handledBy: validHandledBy,
    date: oldDoc.date || new Date(),
    property: {
      id: newPropId,
      name: oldDoc.propertyName || "N/A",
    },
    imageUrl: oldDoc.billImg || "",
    createdBy: oldDoc.staff || null,
    kitchenId: null, // New field
    actionPerformedBy: null, // New field
  };

  return newDocData;
}

/**
 * Maps an Old FeePayment document to the new Payments schema.
 */
function mapOldFeePaymentToNewPayment(oldDoc) {
  const userId = oldDoc.student || oldDoc.dailyRent || null;

  // Map payment mode string for enum compatibility
  let paymentMethod = oldDoc.paymentMode;
  if (paymentMethod === "Net Banking") paymentMethod = "Bank Transfer";
  else if (paymentMethod === "UPI") paymentMethod = "UPI";
  else if (paymentMethod === "Cash") paymentMethod = "Cash";
  else paymentMethod = "Cash"; // Default fallback

  const newDocData = {
    _id: oldDoc._id,
    userId: userId,
    name: oldDoc.name || "N/A",

    // --- Placeholders (Data needs to be populated from User link in a real scenario) ---
    rentType: oldDoc.dailyRent ? "daily" : "monthly",
    userType: oldDoc.student
      ? "student"
      : oldDoc.dailyRent
      ? "dailyRent"
      : "N/A",
    contact: "0000000000",
    room: "N/A",
    // ---------------------------------------------------------------------------------

    rent: oldDoc.monthlyRent || 0,
    amount: oldDoc.amountPaid || 0,
    dueAmount: oldDoc.pendingBalance || 0,
    waveOffAmount: oldDoc.waveOff || 0,
    waveOffReason: oldDoc.waveOffReason || "",
    accountBalance: oldDoc.advanceBalance || 0,
    referralAmountUsed: 0, // New field
    advanceApplied: 0, // New field
    remainingBalance: 0, // New field

    paymentMethod: paymentMethod,
    transactionId: oldDoc.transactionId || null,
    collectedBy: oldDoc.collectedBy || null,

    fullyClearedRentMonths: oldDoc.fullyClearedRentMonths || [],
    paymentForMonths: oldDoc.rentMonth ? [oldDoc.rentMonth] : [],
    advanceForMonths: [], // New field

    paymentDate: oldDoc.paymentDate || new Date(),
    status: "Paid", // Assuming migrated payments are paid
    remarks: oldDoc.remarks || "",

    property: {
      id: null, // Cannot derive ID from just name without lookup
      name: oldDoc.property || "N/A",
    },

    receiptNumber: generateReceiptNumber(), // Required unique field
    razorpayOrderId: null,
    razorpayPaymentId: null,
    razorpaySignature: null,
    clientId: null,
  };

  if (!newDocData.userId) {
    // We can just log this locally, or add it to the report if strict
    // console.warn(`[WARN] FeePayment ID ${oldDoc._id}: Missing student/dailyRent link!`);
  }

  return newDocData;
}

// =========================================================================================
// 4. MIGRATION EXECUTION
// =========================================================================================

async function runMigration() {
  let sourceConn, targetConn;

  // --- NEW: Array to store error details ---
  const migrationErrors = [];

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
    );

    // 2. Define Models
    const SourceExpense = sourceConn.model("Expense", oldExpenseSchema);
    const SourceFeePayment = sourceConn.model(
      "FeePayment",
      oldFeePaymentSchema
    );

    const TargetExpense = targetConn.model("Expense", newExpenseSchema);
    const TargetPayment = targetConn.model("Payments", newPaymentSchema);

    // ---------------------------------------------------------------------
    // 4.1. Migrate Expense data
    // ---------------------------------------------------------------------
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

        // Actual Write
        await TargetExpense.create(newDocData);
        // console.log(`[TRIAL] Would insert Expense: ${newDocData.title}`);

        expSuccess++;
        if (expSuccess % BATCH_SIZE === 0)
          console.log(`Processed ${expSuccess} expenses...`);
      } catch (error) {
        expError++;
        // --- Store error detail ---
        migrationErrors.push({
          model: "Expense",
          id: doc._id.toString(),
          reason: error.message,
        });
      }
    }
    totalSuccess += expSuccess;
    totalError += expError;
    console.log(
      `Expense Migration complete. Total: ${expenseCount}, Success: ${expSuccess}, Errors: ${expError}`
    );

    // ---------------------------------------------------------------------
    // 4.2. Migrate FeePayment data
    // ---------------------------------------------------------------------
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

        // Actual Write
        await TargetPayment.create(newDocData);
        // console.log(`[TRIAL] Would insert Payment: ${newDocData.amount}`);

        paySuccess++;
        if (paySuccess % BATCH_SIZE === 0)
          console.log(`Processed ${paySuccess} payments...`);
      } catch (error) {
        payError++;
        // --- Store error detail ---
        migrationErrors.push({
          model: "FeePayment",
          id: doc._id.toString(),
          reason: error.message,
        });
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
    console.log(`TOTAL SUCCESSFUL INSERTIONS: ${totalSuccess}`);
    console.log(`TOTAL ERRORS ENCOUNTERED: ${totalError}`);
    console.log("=========================================================");

    // --- NEW: Print Detailed Error Report ---
    if (migrationErrors.length > 0) {
      console.log("\n\n**************** ERROR DETAILS REPORT ****************");
      console.table(migrationErrors);
      console.log("******************************************************\n");
    } else {
      console.log("\nNo errors found! Clean migration.");
    }
  }
}

// Execute the main function
runMigration();
