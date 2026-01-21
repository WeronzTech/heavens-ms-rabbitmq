// /**
//  * Mongoose Data Migration Script - USERS & REFERRALS
//  */

// import mongoose from "mongoose";

// // =========================================================================================
// // 1. CONFIGURATION
// // =========================================================================================

// // --- TOGGLE THIS FOR DRY RUN ---
// const DRY_RUN = true; // Set to TRUE to log only, set to FALSE to save to DB

// // --- DATABASE CONNECTION URIS ---
// const SOURCE_MONGO_URI =
//   "mongodb+srv://heavensliving:NJ5i5ZrbMayqRaKk@heavens.fg8yv.mongodb.net/yourDatabaseName?retryWrites=true&w=majority&appName=heavens";
// const TARGET_MONGO_URI =
//   "mongodb+srv://weronztech:YOsHNIqznJgGcnRX@cluster0.degplel.mongodb.net/userDB?retryWrites=true&w=majority";

// const BATCH_SIZE = 100;

// // --- AGENCY MAPPING (Based on your provided IDs) ---
// // Keys are normalized (lowercase, no spaces). Values are the New DB ObjectIds.
// const AGENCY_MAP = {
//   roots: "696f1d1dbf837166a389dc11",
//   fukru: "696f1d363c1f1979ea914299",
//   studycap: "696f1da015a6bdea1355deb9",
//   futurefounders: "696f1db6592538575f12d009",
//   moriz: "696f1dd415a6bdea1355debc",
//   maven: "696f1d0c3c1f1979ea914296", // <--- You mentioned Maven but didn't provide the ID. Add it here if you have it.
// };

// // =========================================================================================
// // 2. HELPER FUNCTION: Resolve Agency ID
// // =========================================================================================

// /**
//  * Cleans the referredBy string and maps it to a known Agency ID.
//  * Handles casing, spaces, and the specific 'moris' -> 'moriz' edge case.
//  */
// function resolveAgencyId(oldReferredBy) {
//   if (!oldReferredBy || typeof oldReferredBy !== "string") return null;

//   // 1. Convert to lowercase and remove ALL spaces
//   let cleanName = oldReferredBy.toLowerCase().replace(/\s+/g, "").trim();

//   // 2. Handle specific naming edge cases
//   if (cleanName === "moris") {
//     cleanName = "moriz";
//   }

//   // 3. Check against the map
//   if (AGENCY_MAP[cleanName]) {
//     return AGENCY_MAP[cleanName];
//   }

//   // Return null if no match found (or if it's a random referral name not in your list)
//   return null;
// }

// // =========================================================================================
// // 3. SCHEMA DEFINITIONS
// // =========================================================================================

// const userSchema = new mongoose.Schema(
//   {
//     userId: { type: String, unique: true },
//     userType: {
//       type: String,
//       enum: ["student", "worker", "dailyRent", "messOnly"],
//       required: true,
//     },
//     rentType: {
//       type: String,
//       enum: ["monthly", "daily", "mess"],
//       required: true,
//     },

//     // --- NEW FIELD ADDED HERE ---
//     referredBy: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "Agency",
//       default: null,
//     },
//     // ----------------------------

//     name: { type: String, required: false },
//     residentId: { type: String },
//     email: { type: String },
//     contact: { type: String, required: true },
//     password: { type: String },

//     personalDetails: {
//       address: String,
//       dob: Date,
//       gender: String,
//       profileImg: String,
//       aadharFront: String,
//       aadharBack: String,
//     },
//     parentsDetails: {
//       name: String,
//       email: String,
//       contact: String,
//       occupation: String,
//       address: String,
//     },
//     studyDetails: {
//       course: String,
//       yearOfStudy: String,
//       institution: String,
//     },
//     workingDetails: {
//       jobTitle: String,
//       companyName: String,
//       location: String,
//       emergencyContact: String,
//     },
//     colivingPartner: {
//       name: String,
//       contact: String,
//       email: String,
//       profileImg: String,
//       aadharFront: String,
//       aadharBack: String,
//       relation: String,
//     },
//     stayDetails: {
//       propertyId: mongoose.Schema.Types.ObjectId,
//       propertyName: String,
//       sharingType: String,
//       roomNumber: String,
//       roomId: mongoose.Schema.Types.ObjectId,
//       depositAmountPaid: { type: Number, default: 0 },
//       nonRefundableDeposit: Number,
//       refundableDeposit: Number,
//       depositStatus: {
//         type: String,
//         enum: ["pending", "paid", "refunded"],
//         default: "pending",
//       },
//       monthlyRent: Number,
//       joinDate: { type: Date },
//       dailyRent: Number,
//       checkInDate: Date,
//       checkOutDate: Date,
//       noOfDays: Number,
//       extendedDays: { type: Number, default: 0 },
//       extendDate: Date,
//     },
//     messDetails: {
//       kitchenId: mongoose.Schema.Types.ObjectId,
//       kitchenName: String,
//       mealType: {
//         type: [String],
//         enum: ["breakfast", "lunch", "dinner"],
//       },
//       rent: Number,
//       messStartDate: Date,
//       messEndDate: Date,
//       noOfDays: Number,
//       extendedDays: Number,
//       extendDate: Date,
//     },
//     financialDetails: {
//       monthlyRent: { type: Number, default: 0 },
//       pendingRent: { type: Number, default: 0 },
//       accountBalance: { type: Number, default: 0 },
//       nextDueDate: { type: Date },
//       clearedTillMonth: { type: String },
//       paymentDueSince: { type: Date },
//       totalAmount: { type: Number, default: 0 },
//       pendingAmount: { type: Number, default: 0 },
//       fines: [
//         {
//           amount: { type: Number, required: true },
//           reason: { type: String, required: true },
//           dateIssued: { type: Date, default: Date.now },
//           paid: { type: Boolean, default: false },
//         },
//       ],
//     },
//     busFee: {
//       required: { type: Boolean, default: false },
//       yearlyAmount: { type: Number, default: 0 },
//       amountPaid: { type: Number, default: 0 },
//       dueAmount: { type: Number, default: 0 },
//       status: {
//         type: String,
//         enum: ["pending", "paid"],
//         default: "pending",
//       },
//       validityStartDate: { type: Date },
//       validityEndDate: { type: Date },
//     },
//     paymentStatus: {
//       type: String,
//       default: "pending",
//       enum: ["pending", "paid"],
//     },
//     currentStatus: {
//       type: String,
//       enum: ["checked_in", "on_leave", "checked_out"],
//       default: "checked_in",
//     },
//     statusRequests: [],
//     currentStatusRequest: {},
//     referralInfo: {
//       isReferralProcessed: { type: Boolean, default: false },
//       referralCode: { type: String },
//       referredByCode: { type: String },
//       currentLevel: { type: Number, default: 0 },
//       totalReferrals: { type: Number, default: 0 },
//       referralEarnings: { type: Number, default: 0 },
//       availableBalance: { type: Number, default: 0 },
//       withdrawnAmount: { type: Number, default: 0 },
//       referredBy: {
//         type: mongoose.Schema.Types.ObjectId,
//         default: null,
//       },
//     },
//     agent: { type: mongoose.Schema.Types.ObjectId },
//     commissionEarned: { type: Number, default: 0 },
//     rentReminder: {
//       daysLeft: { type: Number, default: null },
//       message: { type: String, default: "" },
//     },
//     isApproved: { type: Boolean, default: false },
//     isVerified: { type: Boolean, default: false },
//     isLoginEnabled: { type: Boolean, default: false },
//     isBlocked: { type: Boolean, default: false },
//     isAccessBlockExtendDate: Date,
//     isVacated: { type: Boolean, default: false },
//     isHeavens: { type: Boolean, default: false },
//     isColiving: { type: Boolean, default: false },
//     vacatedAt: Date,
//     profileCompletion: { type: Number, default: 10 },
//     resetPasswordToken: String,
//     resetPasswordExpires: Date,
//     emailVerificationToken: String,
//     emailVerificationExpires: Date,
//     approvedByName: String,
//     updatedByName: String,
//     fcmTokens: [String],
//     serviceHistory: [],
//     notes: String,
//     gaming: {
//       gamePlayed: { type: Boolean, default: false },
//       gameCompleted: { type: Boolean, default: false },
//       gameActive: { type: Boolean, default: false },
//     },
//   },
//   { timestamps: true },
// );

// // --- OLD SOURCE SCHEMAS ---

// const DailyRentSchema = new mongoose.Schema(
//   {
//     name: String,
//     address: String,
//     contactNo: String,
//     email: String,
//     OccupantId: String,
//     checkIn: Date,
//     checkOut: Date,
//     days: Number,
//     totalRent: Number,
//     pendingRent: Number,
//     currentStatus: String,
//     vacate: Boolean,
//     dateOfBirth: Date,
//     gender: String,
//     room: mongoose.Schema.Types.ObjectId,
//     property: mongoose.Schema.Types.ObjectId,
//     photo: String,
//     adharFrontImage: String,
//     adharBackImage: String,
//     roomType: String,
//     roomNo: String,
//     paymentStatus: String,
//     pgName: String,
//   },
//   { collection: "dailyrents" },
// );

// const StudentSchema = new mongoose.Schema(
//   {
//     name: String,
//     address: String,
//     contactNo: String,
//     email: String,
//     studentId: String,

//     // !!! Old Field we are looking for !!!
//     referredBy: String,

//     joinDate: Date,
//     currentStatus: String,
//     vacate: Boolean,
//     vacateDate: Date,
//     password: String,
//     dateOfBirth: Date,
//     gender: String,
//     year: String,
//     collegeName: String,
//     parentName: String,
//     parentNumber: String,
//     parentOccupation: String,
//     course: String,
//     nonRefundableDeposit: Number,
//     refundableDeposit: Number,
//     depositPaid: Number,
//     paymentStatus: String,
//     room: mongoose.Schema.Types.ObjectId,
//     property: mongoose.Schema.Types.ObjectId,
//     photo: String,
//     adharFrontImage: String,
//     adharBackImage: String,
//     roomType: String,
//     roomNo: String,
//     pgName: String,
//     isVerified: Boolean,
//     isBlocked: Boolean,
//     profileCompletionPercentage: String,
//     monthlyRent: Number,
//     pendingRent: Number,
//     accountBalance: Number,
//   },
//   { collection: "students" },
// );

// // =========================================================================================
// // 4. MAPPING FUNCTIONS
// // =========================================================================================

// function mapDailyRentToUser(dailyRentDoc) {
//   // Daily Rent users usually don't have referrals in your old schema,
//   // but if they do, use resolveAgencyId(dailyRentDoc.referredBy)

//   const newUserData = {
//     _id: dailyRentDoc._id,
//     userId: dailyRentDoc.OccupantId,
//     userType: "dailyRent",
//     rentType: "daily",
//     name: dailyRentDoc.name,
//     contact: dailyRentDoc.contactNo,
//     email: dailyRentDoc.email || null,
//     residentId: dailyRentDoc.OccupantId,
//     password: "",

//     referredBy: null, // Default to null for daily rents unless field exists

//     personalDetails: {
//       address: dailyRentDoc.address,
//       dob: dailyRentDoc.dateOfBirth,
//       gender: dailyRentDoc.gender,
//       profileImg: dailyRentDoc.photo,
//       aadharFront: dailyRentDoc.adharFrontImage,
//       aadharBack: dailyRentDoc.adharBackImage,
//     },
//     parentsDetails: {},
//     studyDetails: {},
//     workingDetails: {},
//     messDetails: {},
//     stayDetails: {
//       propertyId: dailyRentDoc.property,
//       propertyName: dailyRentDoc.pgName,
//       sharingType: dailyRentDoc.roomType,
//       roomNumber: dailyRentDoc.roomNo,
//       roomId: dailyRentDoc.room,
//       dailyRent: dailyRentDoc.DailyRent,
//       checkInDate: dailyRentDoc.checkIn,
//       checkOutDate: dailyRentDoc.checkOut,
//       noOfDays: dailyRentDoc.days,
//       depositAmountPaid: 0,
//     },
//     financialDetails: {
//       totalAmount: dailyRentDoc.totalRent,
//       pendingAmount: dailyRentDoc.pendingRent,
//       fines: [],
//     },
//     paymentStatus: dailyRentDoc.paymentStatus
//       ? dailyRentDoc.paymentStatus.toLowerCase()
//       : "pending",
//     currentStatus:
//       dailyRentDoc.currentStatus === "Active" ? "checked_in" : "checked_out",
//     isVacated: dailyRentDoc.vacate || false,
//     isHeavens: false,
//     isColiving: false,
//     profileCompletion: 10,
//     statusRequests: [],
//     referralInfo: {},
//   };
//   return newUserData;
// }

// function mapStudentToUser(studentDoc) {
//   const totalDeposit =
//     (studentDoc.nonRefundableDeposit || 0) +
//     (studentDoc.refundableDeposit || 0);
//   const depositStatus =
//     studentDoc.depositPaid >= totalDeposit ? "paid" : "pending";

//   // --- EXECUTE REFERRAL LOGIC ---
//   const agencyId = resolveAgencyId(studentDoc.referredBy);
//   // ------------------------------

//   const newUserData = {
//     _id: studentDoc._id,
//     userId: studentDoc.studentId,
//     userType: "student",
//     rentType: "monthly",

//     // Assign the resolved ID (will be ObjectId or null)
//     referredBy: agencyId,

//     name: studentDoc.name,
//     contact: studentDoc.contactNo,
//     email: studentDoc.email,
//     residentId: studentDoc.studentId,
//     password: studentDoc.password,
//     personalDetails: {
//       address: studentDoc.address,
//       dob: studentDoc.dateOfBirth,
//       gender: studentDoc.gender,
//       profileImg: studentDoc.photo,
//       aadharFront: studentDoc.adharFrontImage,
//       aadharBack: studentDoc.adharBackImage,
//     },
//     parentsDetails: {
//       name: studentDoc.parentName,
//       contact: studentDoc.parentNumber,
//       occupation: studentDoc.parentOccupation,
//       email: null,
//       address: null,
//     },
//     studyDetails: {
//       course: studentDoc.course,
//       yearOfStudy: studentDoc.year,
//       institution: studentDoc.collegeName,
//     },
//     workingDetails: {},
//     messDetails: {},
//     stayDetails: {
//       propertyId: studentDoc.property,
//       propertyName: studentDoc.pgName,
//       sharingType: studentDoc.roomType,
//       roomNumber: studentDoc.roomNo,
//       roomId: studentDoc.room,
//       depositAmountPaid: studentDoc.depositPaid,
//       nonRefundableDeposit: studentDoc.nonRefundableDeposit,
//       refundableDeposit: studentDoc.refundableDeposit,
//       depositStatus: depositStatus,
//       monthlyRent: studentDoc.monthlyRent,
//       joinDate: studentDoc.joinDate,
//     },
//     financialDetails: {
//       monthlyRent: studentDoc.monthlyRent,
//       pendingRent: studentDoc.pendingRent,
//       accountBalance: studentDoc.accountBalance,
//       fines: [],
//     },
//     busFee: {
//       yearlyAmount: 0,
//       amountPaid: 0,
//       dueAmount: 0,
//       status: "pending",
//       validityStartDate: null,
//       validityEndDate: null,
//     },
//     paymentStatus: studentDoc.paymentStatus
//       ? studentDoc.paymentStatus.toLowerCase()
//       : "pending",
//     currentStatus:
//       studentDoc.currentStatus === "checkedIn" ? "checked_in" : "checked_out",
//     isVerified: studentDoc.isVerified,
//     isBlocked: studentDoc.isBlocked,
//     isVacated: studentDoc.vacate,
//     vacatedAt: studentDoc.vacateDate,
//     profileCompletion: parseInt(studentDoc.profileCompletionPercentage) || 10,
//     isHeavens: false,
//     isColiving: false,
//     statusRequests: [],
//     referralInfo: {},
//   };
//   return newUserData;
// }

// // =========================================================================================
// // 5. MIGRATION EXECUTION
// // =========================================================================================

// async function runMigration() {
//   let sourceConn, targetConn;
//   let dailyRentCount = 0;
//   let studentCount = 0;
//   let successCount = 0;
//   let errorCount = 0;

//   try {
//     console.log(`\n==============================================`);
//     console.log(
//       `MIGRATION MODE: ${DRY_RUN ? "DRY RUN (Read Only)" : "LIVE EXECUTION (Writing to DB)"}`,
//     );
//     console.log(`==============================================\n`);

//     // 1. Establish Connections
//     console.log("Connecting to Source Database...");
//     sourceConn = await mongoose.createConnection(SOURCE_MONGO_URI);
//     console.log("Source Database connected.");

//     console.log("Connecting to Target Database...");
//     targetConn = await mongoose.createConnection(TARGET_MONGO_URI);
//     console.log("Target Database connected.");

//     // 2. Define Models
//     const SourceDailyRent = sourceConn.model("DailyRent", DailyRentSchema);
//     const SourceStudent = sourceConn.model("Student", StudentSchema);
//     const TargetUser = targetConn.model("User", userSchema);

//     // ---------------------------------------------------------------------
//     // 5.1. Migrate DailyRent
//     // ---------------------------------------------------------------------
//     console.log("\n--- Starting DailyRent Migration ---");
//     const dailyRentCursor = SourceDailyRent.find().lean().cursor();

//     for (
//       let doc = await dailyRentCursor.next();
//       doc != null;
//       doc = await dailyRentCursor.next()
//     ) {
//       dailyRentCount++;
//       try {
//         const newUserData = mapDailyRentToUser(doc);

//         if (DRY_RUN) {
//           console.log(`[DRY RUN] Would insert DailyRent: ${newUserData.name}`);
//         } else {
//           await TargetUser.create(newUserData);
//         }

//         successCount++;
//         if (successCount % BATCH_SIZE === 0)
//           console.log(`Processed ${successCount} daily rent docs...`);
//       } catch (error) {
//         errorCount++;
//         console.error(`Error migrating DailyRent: ${doc._id}`, error.message);
//       }
//     }

//     // ---------------------------------------------------------------------
//     // 5.2. Migrate Student (WITH REFERRAL LOGIC)
//     // ---------------------------------------------------------------------
//     console.log("\n--- Starting Student Migration ---");
//     const studentCursor = SourceStudent.find().lean().cursor();
//     let studentSuccessCount = 0;

//     for (
//       let doc = await studentCursor.next();
//       doc != null;
//       doc = await studentCursor.next()
//     ) {
//       studentCount++;
//       try {
//         const newUserData = mapStudentToUser(doc);

//         if (DRY_RUN) {
//           // Additional logging for Dry Run to verify Referrals
//           let logMsg = `[DRY RUN] Student: ${newUserData.name}`;
//           if (newUserData.referredBy) {
//             logMsg += ` | REFERRAL DETECTED: ${doc.referredBy} mapped to ID ${newUserData.referredBy}`;
//           } else if (doc.referredBy) {
//             logMsg += ` | REFERRAL IGNORED (Not in Agency Map): ${doc.referredBy}`;
//           }
//           console.log(logMsg);
//         } else {
//           await TargetUser.create(newUserData);
//         }

//         studentSuccessCount++;
//         successCount++;
//         if (studentSuccessCount % BATCH_SIZE === 0)
//           console.log(`Processed ${studentSuccessCount} student docs...`);
//       } catch (error) {
//         errorCount++;
//         console.error(`Error migrating Student: ${doc._id}`, error.message);
//       }
//     }

//     console.log(`\n==============================================`);
//     console.log(`MIGRATION SUMMARY (${DRY_RUN ? "DRY RUN" : "LIVE"})`);
//     console.log(`Total Scanned: ${dailyRentCount + studentCount}`);
//     console.log(`Success: ${successCount}`);
//     console.log(`Errors: ${errorCount}`);
//     console.log(`==============================================`);
//   } catch (error) {
//     console.error("\n*** FATAL ERROR ***", error);
//   } finally {
//     if (sourceConn) await sourceConn.close();
//     if (targetConn) await targetConn.close();
//   }
// }

// runMigration();
/**
 * Mongoose Referral Update Script - USERS ONLY
 * * Logic:
 * 1. Reads 'students' from Old DB.
 * 2. Matches 'users' in New DB by _id.
 * 3. Updates ONLY the 'referredBy' field if a valid agency is found.
 */

import mongoose from "mongoose";

// =========================================================================================
// 1. CONFIGURATION
// =========================================================================================

// --- TOGGLE THIS FOR DRY RUN ---
const DRY_RUN = false; // Set to TRUE to log only, set to FALSE to actually update DB

// --- DATABASE CONNECTION URIS ---
const SOURCE_MONGO_URI =
  "mongodb+srv://heavensliving:NJ5i5ZrbMayqRaKk@heavens.fg8yv.mongodb.net/yourDatabaseName?retryWrites=true&w=majority&appName=heavens";
const TARGET_MONGO_URI =
  "mongodb+srv://weronztech:YOsHNIqznJgGcnRX@cluster0.degplel.mongodb.net/userDB?retryWrites=true&w=majority";

const BATCH_SIZE = 100;

// --- AGENCY MAPPING ---
const AGENCY_MAP = {
  roots: "696f1d1dbf837166a389dc11",
  fukru: "696f1d363c1f1979ea914299",
  studycap: "696f1da015a6bdea1355deb9",
  futurefounders: "696f1db6592538575f12d009",
  moriz: "696f1dd415a6bdea1355debc",
  maven: "696f1d0c3c1f1979ea914296",
};

// =========================================================================================
// 2. HELPER FUNCTION: Resolve Agency ID
// =========================================================================================

function resolveAgencyId(oldReferredBy) {
  if (!oldReferredBy || typeof oldReferredBy !== "string") return null;

  // 1. Convert to lowercase and remove ALL spaces
  let cleanName = oldReferredBy.toLowerCase().replace(/\s+/g, "").trim();

  // 2. Handle specific naming edge cases
  if (cleanName === "moris") {
    cleanName = "moriz";
  }

  // 3. Check against the map
  if (AGENCY_MAP[cleanName]) {
    return AGENCY_MAP[cleanName];
  }

  return null;
}

// =========================================================================================
// 3. SCHEMA DEFINITIONS (Minimal needed for this operation)
// =========================================================================================

// We only need the _id and referredBy field for the Source Student
const StudentSchema = new mongoose.Schema(
  {
    name: String,
    referredBy: String,
  },
  { collection: "students" },
);

// We only need to touch the referredBy field in the Target User
const userSchema = new mongoose.Schema(
  {
    referralInfo: {
      referredBy: {
        type: mongoose.Schema.Types.ObjectId,
        default: null,
      },
    },
  },
  { strict: false }, // Strict false allows us to update one field without defining the whole schema
);

// =========================================================================================
// 4. UPDATE EXECUTION
// =========================================================================================

async function runUpdate() {
  let sourceConn, targetConn;
  let processedCount = 0;
  let updateCount = 0;
  let skippedCount = 0;

  try {
    console.log(`\n==============================================`);
    console.log(
      `MODE: ${DRY_RUN ? "DRY RUN (No changes)" : "LIVE (Updating DB)"}`,
    );
    console.log(`==============================================\n`);

    // 1. Establish Connections
    console.log("Connecting to Source Database...");
    sourceConn = await mongoose.createConnection(SOURCE_MONGO_URI);

    console.log("Connecting to Target Database...");
    targetConn = await mongoose.createConnection(TARGET_MONGO_URI);

    // 2. Define Models
    const SourceStudent = sourceConn.model("Student", StudentSchema);
    const TargetUser = targetConn.model("User", userSchema);

    // 3. Start Processing
    console.log("\n--- Scanning Source Students for Referrals ---");

    // Only fetch students who actually HAVE a referredBy value to save time
    const cursor = SourceStudent.find({
      referredBy: { $ne: null, $ne: "" },
    })
      .lean()
      .cursor();

    for (
      let doc = await cursor.next();
      doc != null;
      doc = await cursor.next()
    ) {
      processedCount++;

      const agencyId = resolveAgencyId(doc.referredBy);

      // If we found a valid agency match
      if (agencyId) {
        if (DRY_RUN) {
          console.log(
            `[DRY RUN] Match Found! User: ${doc.name} (${doc._id}) | Old Ref: "${doc.referredBy}" -> New AgencyID: ${agencyId}`,
          );
          updateCount++;
        } else {
          // Perform the Update
          const result = await TargetUser.updateOne(
            { _id: doc._id }, // Match by ID
            { $set: { "referralInfo.referredBy": agencyId } }, // Set ONLY referredBy
          );

          if (result.matchedCount > 0) {
            updateCount++;
            // Optional: Log every update or just batches
            // console.log(`Updated User: ${doc._id}`);
          } else {
            console.warn(
              `[WARNING] Source Student ${doc._id} not found in Target DB.`,
            );
          }
        }
      } else {
        // Log skipped referrals (names that didn't match your list)
        // console.log(`[SKIP] Unmapped Agency: "${doc.referredBy}" for User ${doc.name}`);
        skippedCount++;
      }

      if (processedCount % BATCH_SIZE === 0) {
        console.log(`Scanned ${processedCount} students with referrals...`);
      }
    }

    console.log(`\n==============================================`);
    console.log(`UPDATE SUMMARY`);
    console.log(`Total Students with 'referredBy': ${processedCount}`);
    console.log(`Updates to Perform/Performed: ${updateCount}`);
    console.log(`Skipped (Unmapped Agency Name): ${skippedCount}`);
    console.log(`==============================================`);
  } catch (error) {
    console.error("\n*** FATAL ERROR ***", error);
  } finally {
    if (sourceConn) await sourceConn.close();
    if (targetConn) await targetConn.close();
  }
}

runUpdate();
