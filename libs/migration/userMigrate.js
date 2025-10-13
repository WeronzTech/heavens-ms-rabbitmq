/**
 * Mongoose Data Migration Script - USERS ONLY
 *
 * This script connects to the source and target databases to fetch data from
 * 'dailyrents' and 'students' and inserts it into the unified 'users' collection.
 *
 * IMPORTANT: The original Mongoose _id is preserved to maintain references
 * from other collections (like FeePayment, Maintenance, etc.).
 */

import mongoose from "mongoose";

// =========================================================================================
// 1. CONFIGURATION
// =========================================================================================

// --- SOURCE DATABASE (Old DailyRent and Student data lives here) ---
const SOURCE_MONGO_URI =
  "mongodb+srv://heavensliving:NJ5i5ZrbMayqRaKk@heavens.fg8yv.mongodb.net/yourDatabaseName?retryWrites=true&w=majority&appName=heavens"; // <-- UPDATE THIS
// --- TARGET DATABASE (New User data will be inserted here) ---
const TARGET_MONGO_URI =
  "mongodb+srv://weronztech:YOsHNIqznJgGcnRX@cluster0.degplel.mongodb.net/userDB?retryWrites=true&w=majority"; // <-- UPDATE THIS

const BATCH_SIZE = 100;

// =========================================================================================
// 2. SCHEMA DEFINITIONS (Used for both source and target connections)
// =========================================================================================

// New User Schema
const userSchema = new mongoose.Schema(
  {
    userId: { type: String, unique: true },
    userType: {
      type: String,
      enum: ["student", "worker", "dailyRent", "messOnly"],
      required: true,
    },
    rentType: {
      type: String,
      enum: ["monthly", "daily", "mess"],
      required: true,
    },
    name: { type: String },
    residentId: { type: String },
    email: { type: String },
    contact: { type: String, required: true },
    password: { type: String },
    personalDetails: {
      address: String,
      dob: Date,
      gender: String,
      profileImg: String,
      aadharFront: String,
      aadharBack: String,
    },
    parentsDetails: {
      name: String,
      contact: String,
      occupation: String,
    },
    studyDetails: {
      course: String,
      institution: String,
    },
    stayDetails: {
      propertyId: mongoose.Schema.Types.ObjectId,
      propertyName: String,
      sharingType: String,
      roomNumber: String,
      roomId: mongoose.Schema.Types.ObjectId,
      depositAmountPaid: { type: Number, default: 0 },
      nonRefundableDeposit: Number,
      refundableDeposit: Number,
      depositStatus: { type: String, default: "pending" },
      monthlyRent: Number,
      joinDate: { type: Date },
      dailyRent: Number,
      checkInDate: Date,
      checkOutDate: Date,
      noOfDays: Number,
    },
    financialDetails: {
      monthlyRent: { type: Number, default: 0 },
      pendingRent: { type: Number, default: 0 },
      accountBalance: { type: Number, default: 0 },
      totalAmount: { type: Number, default: 0 },
      pendingAmount: { type: Number, default: 0 },
    },
    paymentStatus: { type: String, default: "pending" },
    currentStatus: { type: String, default: "checked_in" },
    isVerified: { type: Boolean, default: false },
    isBlocked: { type: Boolean, default: false },
    isVacated: { type: Boolean, default: false },
    vacatedAt: Date,
    profileCompletion: { type: Number, default: 10 },
    isApproved: { type: Boolean, default: true },
    isLoginEnabled: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Old DailyRent Schema
const DailyRentSchema = new mongoose.Schema(
  {
    name: String,
    address: String,
    contactNo: String,
    email: String,
    bloodGroup: String,
    DailyRent: Number,
    photo: String,
    adharFrontImage: String,
    adharBackImage: String,
    roomType: String,
    roomNo: String,
    typeOfStay: String,
    paymentStatus: String,
    pgName: String,
    OccupantId: String,
    checkIn: Date,
    checkOut: Date,
    days: Number,
    totalRent: Number,
    pendingRent: Number,
    currentStatus: String,
    vacate: Boolean,
    dateOfBirth: Date,
    gender: String,
    branch: String,
    phase: String,
    room: mongoose.Schema.Types.ObjectId,
    payments: [mongoose.Schema.Types.ObjectId],
    property: mongoose.Schema.Types.ObjectId,
  },
  { collection: "dailyrents" }
);

// Old Student Schema
const StudentSchema = new mongoose.Schema(
  {
    name: String,
    address: String,
    contactNo: String,
    email: String,
    bloodGroup: String,
    parentName: String,
    parentNumber: String,
    course: String,
    nonRefundableDeposit: Number,
    refundableDeposit: Number,
    depositPaid: Number,
    paymentStatus: String,
    adharFrontImage: String,
    adharBackImage: String,
    photo: String,
    roomType: String,
    roomNo: String,
    referredBy: String,
    typeOfStay: String,
    pgName: String,
    studentId: String,
    joinDate: Date,
    currentStatus: String,
    vacate: Boolean,
    vacateDate: Date,
    password: String,
    dateOfBirth: Date,
    gender: String,
    year: String,
    collegeName: String,
    parentOccupation: String,
    workingPlace: String,
    branch: String,
    phase: String,
    isVerified: Boolean,
    isBlocked: Boolean,
    profileCompletionPercentage: String,
    monthlyRent: Number,
    pendingRent: Number,
    accountBalance: Number,
    room: mongoose.Schema.Types.ObjectId,
    property: mongoose.Schema.Types.ObjectId,
  },
  { collection: "students" }
);

// =========================================================================================
// 3. MAPPING FUNCTIONS (Updated to include _id)
// =========================================================================================

/**
 * Maps a DailyRent document to the new User schema.
 */
function mapDailyRentToUser(dailyRentDoc) {
  // Note: nonRefundableDeposit, refundableDeposit, depositPaid are not available in DailyRent,
  // so deposit logic is simplified or left with default values.
  const newUserData = {
    // !!! CRITICAL: Preserve the Mongoose ObjectId for external references !!!
    _id: dailyRentDoc._id, // Core User Identification & Type

    userType: "dailyRent",
    rentType: "daily",
    name: dailyRentDoc.name,
    contact: dailyRentDoc.contactNo,
    email: dailyRentDoc.email || null,
    residentId: dailyRentDoc.OccupantId,
    password: "", // Personal Details

    personalDetails: {
      address: dailyRentDoc.address,
      dob: dailyRentDoc.dateOfBirth,
      gender: dailyRentDoc.gender,
      profileImg: dailyRentDoc.photo,
      aadharFront: dailyRentDoc.adharFrontImage,
      aadharBack: dailyRentDoc.adharBackImage,
    }, // Stay Details (DailyRent specific)

    stayDetails: {
      propertyId: dailyRentDoc.property,
      propertyName: dailyRentDoc.pgName,
      sharingType: dailyRentDoc.roomType,
      roomNumber: dailyRentDoc.roomNo,
      roomId: dailyRentDoc.room,
      dailyRent: dailyRentDoc.DailyRent,
      checkInDate: dailyRentDoc.checkIn,
      checkOutDate: dailyRentDoc.checkOut,
      noOfDays: dailyRentDoc.days, // Deposit fields will default to 0/pending in the new schema
    }, // Financial Details

    financialDetails: {
      totalAmount: dailyRentDoc.totalRent,
      pendingAmount: dailyRentDoc.pendingRent, // Monthly rent fields default to 0
    }, // Status & Flags

    paymentStatus: dailyRentDoc.paymentStatus
      ? dailyRentDoc.paymentStatus.toLowerCase()
      : "pending",
    currentStatus:
      dailyRentDoc.currentStatus === "Active" ? "checked_in" : "checked_out",
    isVacated: dailyRentDoc.vacate,
    userId: dailyRentDoc.OccupantId,
  };

  return newUserData;
}

/**
 * Maps a Student document to the new User schema.
 */
function mapStudentToUser(studentDoc) {
  const totalDeposit =
    (studentDoc.nonRefundableDeposit || 0) +
    (studentDoc.refundableDeposit || 0);
  const depositStatus =
    studentDoc.depositPaid >= totalDeposit ? "paid" : "pending";

  const newUserData = {
    // !!! CRITICAL: Preserve the Mongoose ObjectId for external references !!!
    _id: studentDoc._id, // Core User Identification & Type

    userType: "student",
    rentType: "monthly",
    name: studentDoc.name,
    contact: studentDoc.contactNo,
    email: studentDoc.email,
    residentId: studentDoc.studentId,
    password: studentDoc.password,
    userId: studentDoc.studentId, // Personal Details

    personalDetails: {
      address: studentDoc.address,
      dob: studentDoc.dateOfBirth,
      gender: studentDoc.gender,
      profileImg: studentDoc.photo,
      aadharFront: studentDoc.adharFrontImage,
      aadharBack: studentDoc.adharBackImage,
    }, // Parent Details

    parentsDetails: {
      name: studentDoc.parentName,
      contact: studentDoc.parentNumber,
      occupation: studentDoc.parentOccupation,
    }, // Study Details

    studyDetails: {
      course: studentDoc.course,
      yearOfStudy: studentDoc.year,
      institution: studentDoc.collegeName,
    }, // Stay Details (MonthlyRent specific)

    stayDetails: {
      propertyId: studentDoc.property,
      propertyName: studentDoc.pgName,
      sharingType: studentDoc.roomType,
      roomNumber: studentDoc.roomNo,
      roomId: studentDoc.room,
      depositAmountPaid: studentDoc.depositPaid,
      nonRefundableDeposit: studentDoc.nonRefundableDeposit,
      refundableDeposit: studentDoc.refundableDeposit,
      depositStatus: depositStatus,
      monthlyRent: studentDoc.monthlyRent,
      joinDate: studentDoc.joinDate,
    }, // Financial Details

    financialDetails: {
      monthlyRent: studentDoc.monthlyRent,
      pendingRent: studentDoc.pendingRent,
      accountBalance: studentDoc.accountBalance, // Daily rent fields default to 0
    }, // Status & Flags

    paymentStatus: studentDoc.paymentStatus
      ? studentDoc.paymentStatus.toLowerCase()
      : "pending",
    currentStatus:
      studentDoc.currentStatus === "checkedIn" ? "checked_in" : "checked_out",
    isVerified: studentDoc.isVerified,
    isBlocked: studentDoc.isBlocked,
    isVacated: studentDoc.vacate,
    vacatedAt: studentDoc.vacateDate,
    profileCompletion: parseInt(studentDoc.profileCompletionPercentage) || 10,
  };

  return newUserData;
}

// =========================================================================================
// 4. MIGRATION EXECUTION
// =========================================================================================

async function runMigration() {
  let sourceConn, targetConn;
  let dailyRentCount = 0;
  let studentCount = 0;
  let successCount = 0;
  let errorCount = 0;

  try {
    // 1. Establish Connections
    console.log("Connecting to Source Database...");
    sourceConn = await mongoose.createConnection(SOURCE_MONGO_URI);
    console.log("Source Database connected successfully.");

    console.log("Connecting to Target Database...");
    targetConn = await mongoose.createConnection(TARGET_MONGO_URI);
    console.log(
      "Target Database connected successfully. Starting migration..."
    ); // 2. Define Models on specific connections

    const SourceDailyRent = sourceConn.model("DailyRent", DailyRentSchema);
    const SourceStudent = sourceConn.model("Student", StudentSchema);
    const TargetUser = targetConn.model("User", userSchema); // Note: This will be the 'users' collection // --------------------------------------------------------------------- // 4.1. Migrate DailyRent data // ---------------------------------------------------------------------

    console.log("\n--- Starting DailyRent Migration ---");
    const dailyRentCursor = SourceDailyRent.find().lean().cursor();

    for (
      let doc = await dailyRentCursor.next();
      doc != null;
      doc = await dailyRentCursor.next()
    ) {
      dailyRentCount++;
      try {
        const newUserData = mapDailyRentToUser(doc); // Use insertMany with forceServerObjectId: true in a bulk operation, or // use insertOne/create as shown here, which works by setting _id in the object.
        await TargetUser.create(newUserData);
        successCount++;
        if (successCount % BATCH_SIZE === 0) {
          console.log(`Processed ${successCount} documents...`);
        }
      } catch (error) {
        errorCount++;
        console.error(
          `Error migrating DailyRent OccupantId: ${
            doc.OccupantId || "Unknown ID"
          } (${doc._id})`,
          error.message
        );
      }
    }
    console.log(
      `\nDailyRent Migration complete. Total: ${dailyRentCount}, Success: ${
        successCount - (successCount - dailyRentCount)
      }, Errors: ${errorCount - (errorCount - studentCount)}` // Fix calculation logic
    ); // Recalculate based on total students processed

    let currentDailySuccess =
      dailyRentCount - (dailyRentCount - (successCount - studentCount));
    let currentDailyError = errorCount - (errorCount - studentCount); // --------------------------------------------------------------------- // 4.2. Migrate Student data // ---------------------------------------------------------------------

    console.log("\n--- Starting Student Migration ---");
    const studentCursor = SourceStudent.find().lean().cursor();
    let studentSuccessCount = 0;
    let studentErrorCount = 0;

    for (
      let doc = await studentCursor.next();
      doc != null;
      doc = await studentCursor.next()
    ) {
      studentCount++;
      try {
        const newUserData = mapStudentToUser(doc); // Insert into the Target Database using the TargetUser model
        await TargetUser.create(newUserData);
        studentSuccessCount++;
        if (studentSuccessCount % BATCH_SIZE === 0) {
          console.log(`Processed ${studentSuccessCount} student documents...`);
        }
      } catch (error) {
        studentErrorCount++;
        console.error(
          `Error migrating Student ID: ${doc.studentId || "Unknown ID"} (${
            doc._id
          })`,
          error.message
        );
      }
    }

    successCount = currentDailySuccess + studentSuccessCount;
    errorCount = currentDailyError + studentErrorCount;

    console.log(
      `\nStudent Migration complete. Total: ${studentCount}, Success: ${studentSuccessCount}, Errors: ${studentErrorCount}`
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
    console.log("\n---------------------------------------------------------");
    console.log(
      `MIGRATION FINISHED: Total Documents Processed: ${
        dailyRentCount + studentCount
      }`
    );
    console.log(`Total Successful Insertions: ${successCount}`);
    console.log(`Total Errors Encountered: ${errorCount}`);
    console.log("---------------------------------------------------------");
  }
}

// Execute the main function
runMigration();
