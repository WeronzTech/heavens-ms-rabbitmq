// import mongoose from "mongoose";

// // --- Configuration ---
// // Set to 'false' to perform actual database writes.
// // Set to 'true' to only log what would be updated without saving changes.
// const IS_DRY_RUN = false;

// // ❗ IMPORTANT: Set the connection strings for your TWO databases.
// const USERS_DB_URI =
//   "mongodb+srv://weronztech:YOsHNIqznJgGcnRX@cluster0.degplel.mongodb.net/userDB?retryWrites=true&w=majority";
// const PAYMENTS_DB_URI =
//   "mongodb+srv://weronztech:YOsHNIqznJgGcnRX@cluster0.degplel.mongodb.net/accountsDB?retryWrites=true&w=majority";

// // --- Paste Schemas Directly Here ---

// // 1. User Schema (from your user.model.js)
// // Note: I've removed the pre-save hooks and other methods as they aren't needed for this update script.

// const userSchema = new mongoose.Schema(
//   {
//     userId: {
//       type: String,
//       unique: true,
//     },
//     // Core user identification
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

//     // Basic information (common to all)
//     name: { type: String, required: false },
//     // The 'sparse' option is defined in the userSchema.index() call below
//     residentId: { type: String },
//     // The 'sparse' option is defined in the userSchema.index() call below
//     email: { type: String },
//     contact: { type: String, required: true },
//     password: { type: String },

//     // Personal details - For all userType
//     personalDetails: {
//       address: String,
//       dob: Date,
//       gender: String,
//       profileImg: String,
//       aadharFront: String,
//       aadharBack: String,
//     },

//     // Parent details (mainly for students)
//     parentsDetails: {
//       name: String,
//       email: String,
//       contact: String,
//       occupation: String,
//     },

//     // Study details (for students)
//     studyDetails: {
//       course: String,
//       yearOfStudy: String,
//       institution: String,
//     },

//     // Work details (for workers)
//     workingDetails: {
//       jobTitle: String,
//       companyName: String,
//       location: String,
//       emergencyContact: String,
//     },

//     // Stay details - for monthlyRent & dailyRent Residents
//     stayDetails: {
//       // Common fields
//       propertyId: mongoose.Schema.Types.ObjectId,
//       propertyName: String,
//       sharingType: String,
//       roomNumber: String,
//       roomId: mongoose.Schema.Types.ObjectId,

//       //For MonthlyRent
//       depositAmountPaid: { type: Number, default: 0 },
//       nonRefundableDeposit: Number,
//       refundableDeposit: Number,
//       depositStatus: {
//         type: String,
//         enum: ["pending", "paid", "refunded"],
//         default: "pending",
//       },
//       monthlyRent: Number,
//       joinDate: { type: Date, default: Date.now },

//       //For DailyRent
//       dailyRent: Number,
//       checkInDate: Date,
//       checkOutDate: Date,
//       noOfDays: Number,
//       extendedDays: Number,
//       extendDate: Date,
//     },

//     // Kitchen/Mess details (for MessOnly users)
//     messDetails: {
//       kitchenId: mongoose.Schema.Types.ObjectId,
//       kitchenName: String,
//       mealType: {
//         type: [String],
//         enum: ["breakfast", "lunch", "dinner"],
//       },
//       rent: Number,
//       messStartDate: {
//         type: Date,
//       },
//       messEndDate: {
//         type: Date,
//       },
//       noOfDays: Number,
//       extendedDays: Number,
//       extendDate: Date,
//     },

//     // Financial details
//     financialDetails: {
//       // For Monthly-Rent
//       monthlyRent: { type: Number, default: 0 },
//       pendingRent: { type: Number, default: 0 },
//       accountBalance: { type: Number, default: 0 },
//       nextDueDate: { type: Date },
//       clearedTillMonth: { type: String },
//       paymentDueSince: { type: Date },

//       // For Daily-Rent & Mess-Only
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

//     // Payment and status
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

//     // Status requests
//     statusRequests: [
//       {
//         type: {
//           type: String,
//           enum: ["checked_in", "on_leave", "checked_out"],
//         },
//         requestedAt: {
//           type: Date,
//           default: Date.now,
//         },
//         status: {
//           type: String,
//           enum: ["pending", "approved", "rejected"],
//           default: "pending",
//           // Removed 'index: true' from here to prevent duplicate index warning
//         },
//         reason: String,
//         reviewerComment: String,
//         reviewedAt: Date,
//         reviewedBy: String,

//         effectiveDate: Date,
//         isInstantCheckout: {
//           type: Boolean,
//           default: false,
//         },
//         isRefundEligible: {
//           type: Boolean,
//           default: false,
//         },
//       },
//     ],
//     currentStatusRequest: {
//       type: {
//         type: String,
//         enum: ["checked_in", "on_leave", "checked_out"],
//       },
//       status: {
//         type: String,
//         enum: ["pending", "approved", "rejected"],
//       },
//     },

//     // Referral system
//     referralInfo: {
//       type: new mongoose.Schema(
//         {
//           isReferralProcessed: { type: Boolean, default: false },
//           referralCode: {
//             type: String,
//             unique: true,
//             sparse: true,
//           },
//           referredByCode: { type: String },
//           referralHistory: {
//             referredUsers: [String],
//             lastUsed: Date,
//           },
//           level: { type: Number, default: 1 },
//           totalReferrals: { type: Number, default: 0 },
//           referralEarnings: { type: Number, default: 0 },
//           withdrawnAmount: { type: Number, default: 0 },
//         },
//         { _id: false }
//       ),
//       default: {},
//     },

//     // Reminders and notifications
//     rentReminder: {
//       daysLeft: { type: Number, default: null },
//       message: { type: String, default: "" },
//     },

//     // User permissions and status flags
//     isApproved: { type: Boolean, default: false },
//     isVerified: { type: Boolean, default: false },
//     isLoginEnabled: { type: Boolean, default: false },
//     isBlocked: { type: Boolean, default: false },
//     isAccessBlockExtendDate: Date,
//     isVacated: { type: Boolean, default: false },
//     isHeavens: { type: Boolean, default: false },
//     vacatedAt: Date,

//     // Profile completion
//     profileCompletion: { type: Number, required: true, default: 10 },

//     // Authentication tokens
//     resetPasswordToken: String,
//     resetPasswordExpires: Date,
//     emailVerificationToken: String,
//     emailVerificationExpires: Date,

//     // Admin fields
//     approvedByName: String,
//     updatedByName: String,

//     // Device tokens for notifications
//     fcmTokens: [String],

//     // Stay history for tracking multiple stays
//     serviceHistory: [
//       {
//         userType: String,
//         rentType: String,
//         propertyName: String,
//         kitchenName: String,
//         sharingType: String,
//         roomNumber: String,
//         nonRefundableDeposit: Number,
//         refundableDeposit: Number,
//         depositAmountPaid: Number,
//         rent: Number,
//         serviceStartDate: Date,
//         serviceEndDate: Date,
//         reason: String,
//         _id: false,
//       },
//     ],
//     notes: String,
//   },
//   {
//     timestamps: true,
//     // Add discriminator key for potential future sub-schemas
//     discriminatorKey: "userType",
//   }
// );

// // Indexes for performance optimization
// // 2. Payment Schema (from your payments.model.js
// const paymentSchema = new mongoose.Schema(
//   {
//     name: { type: String, required: true },
//     rentType: { type: String, required: true },
//     userType: { type: String, required: true },
//     contact: { type: String, required: true },
//     room: { type: String, required: true },
//     rent: { type: Number, required: true },
//     amount: { type: Number, required: true }, // Payment amount
//     dueAmount: { type: Number, required: true }, // Remaining pending amount
//     waveOffAmount: { type: Number, required: false },
//     waveOffReason: { type: String, required: false },
//     accountBalance: { type: Number, required: true },
//     advanceApplied: { type: Number, default: 0 }, // How much credit was used for this payment
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
//       }, // Only required for UPI and Online payments
//       sparse: true, // Allow null for manual payments (Cash and Bank Transfer)
//     },
//     collectedBy: { type: String, required: false },
//     fullyClearedRentMonths: [{ type: String, required: true }], // Example: "January 2024"
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
//     receiptNumber: { type: String },
//     razorpayOrderId: { type: String }, // Store Razorpay order ID
//     razorpayPaymentId: { type: String }, // Store transaction ID
//     razorpaySignature: { type: String }, // For verifying payment
//     clientId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "Client",
//       required: false,
//     }, // Link to the client
//     userId: { type: mongoose.Schema.Types.ObjectId, required: true },
//   },
//   { timestamps: true }
// );

// /**
//  * Main function to perform the update logic across two databases.
//  */
// const updateAcrossDatabases = async () => {
//   console.log("🚀 Starting user financial details update script...");

//   let userDbConnection;
//   let paymentDbConnection;

//   try {
//     // 1. Establish connections to both databases
//     console.log("Connecting to databases...");
//     userDbConnection = await mongoose
//       .createConnection(USERS_DB_URI)
//       .asPromise();
//     paymentDbConnection = await mongoose
//       .createConnection(PAYMENTS_DB_URI)
//       .asPromise();
//     console.log(
//       "✅ Successfully connected to both User and Payment databases."
//     );

//     // 2. Register models on their respective connections
//     const User = userDbConnection.model("User", userSchema);
//     const Payments = paymentDbConnection.model("Payments", paymentSchema);

//     let updatedCount = 0;
//     let skippedCount = 0;

//     // 3. Fetch all relevant users from the User database
//     const users = await User.find({
//       rentType: "monthly",
//       isVacated: false,
//     }).select("_id name userId financialDetails");

//     console.log(
//       `🔍 Found ${users.length} monthly rent users to process from the Users DB.`
//     );

//     // 4. Iterate over each user
//     for (const user of users) {
//       // 5. Find the latest payment for this user from the Payments database
//       const latestPayment = await Payments.findOne({
//         userId: user._id, // This links the two collections
//         status: "Paid",
//       }).sort({ paymentDate: -1, _id: -1 });

//       if (!latestPayment || !latestPayment.fullyClearedRentMonths?.length) {
//         // console.log(`- Skipping user ${user.name} (${user.userId}): No valid payment found in Payments DB.`);
//         skippedCount++;
//         continue;
//       }

//       // 6. Determine the most recently cleared month
//       const clearedMonths = latestPayment.fullyClearedRentMonths;
//       const latestClearedMonthStr = clearedMonths[clearedMonths.length - 1];

//       // 7. Calculate the next due date
//       const lastClearedDate = new Date(Date.parse(latestClearedMonthStr));
//       if (isNaN(lastClearedDate)) {
//         console.warn(
//           `- Skipping user ${user.name} (${user.userId}): Invalid date format: "${latestClearedMonthStr}"`
//         );
//         skippedCount++;
//         continue;
//       }

//       const year = lastClearedDate.getFullYear();
//       // `getMonth()` is 0-indexed (Jan=0), so add 1. `padStart` ensures two digits (e.g., '09').
//       const month = String(lastClearedDate.getMonth() + 1).padStart(2, "0");
//       const formattedClearedMonth = `${year}-${month}`;

//       const nextDueDate = new Date(lastClearedDate);
//       nextDueDate.setMonth(nextDueDate.getMonth() + 1);
//       nextDueDate.setDate(latestPayment.paymentDate.getDate());
//       nextDueDate.setHours(0, 0, 0, 0);

//       // 8. Update the user document in memory
//       user.financialDetails.clearedTillMonth = formattedClearedMonth;
//       user.financialDetails.nextDueDate = nextDueDate;

//       console.log(
//         `- Preparing update for ${user.name} (${
//           user.userId
//         }): Cleared until ${latestClearedMonthStr}, Next due: ${nextDueDate.toLocaleDateString()}`
//       );

//       // 9. Save changes to the User database if not a dry run
//       if (!IS_DRY_RUN) {
//         await user.save();
//       }
//       updatedCount++;
//     }

//     console.log("\n--- Script Summary ---");
//     if (IS_DRY_RUN) {
//       console.log("🛠️ DRY RUN MODE: No changes were saved to the database.");
//     }
//     console.log(`✅ Users processed for update: ${updatedCount}`);
//     console.log(`⏩ Users skipped: ${skippedCount}`);
//     console.log("🎉 Script finished successfully!");
//   } catch (error) {
//     console.error("\n❌ An error occurred during the update process:", error);
//   } finally {
//     // 10. Disconnect from both databases
//     if (userDbConnection) await userDbConnection.close();
//     if (paymentDbConnection) await paymentDbConnection.close();
//     console.log("🔌 Disconnected from all databases.");
//   }
// };

// // Run the script
// updateAcrossDatabases();
import mongoose from "mongoose";

// --- Configuration ---
// Set to 'false' to perform actual database writes.
// Set to 'true' to only log what would be updated without saving changes.
const IS_DRY_RUN = false;

// ❗ IMPORTANT: Set the connection strings for your TWO databases.
const USERS_DB_URI =
  "mongodb+srv://weronztech:YOsHNIqznJgGcnRX@cluster0.degplel.mongodb.net/userDB?retryWrites=true&w=majority";
const PAYMENTS_DB_URI =
  "mongodb+srv://weronztech:YOsHNIqznJgGcnRX@cluster0.degplel.mongodb.net/accountsDB?retryWrites=true&w=majority";

// =========================================================================================
// SCHEMA DEFINITIONS (Synced with uploaded models to prevent data loss on save)
// =========================================================================================

// 1. User Schema (Matches models/user.model.js)
const userSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      unique: true,
    },
    // Core user identification
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

    // Basic information (common to all)
    name: { type: String, required: false },
    residentId: { type: String },
    email: { type: String },
    contact: { type: String, required: true },
    password: { type: String },

    // Personal details - For all userType
    personalDetails: {
      address: String,
      dob: Date,
      gender: String,
      profileImg: String,
      aadharFront: String,
      aadharBack: String,
    },

    // Parent details (mainly for students)
    parentsDetails: {
      name: String,
      email: String,
      contact: String,
      occupation: String,
      address: String,
    },

    // Study details (for students)
    studyDetails: {
      course: String,
      yearOfStudy: String,
      institution: String,
    },

    // Work details (for workers)
    workingDetails: {
      jobTitle: String,
      companyName: String,
      location: String,
      emergencyContact: String,
    },

    colivingPartner: {
      name: String,
      contact: String,
      email: String,
      profileImg: String,
      aadharFront: String,
      aadharBack: String,
      relation: String,
    },

    // Stay details - for monthlyRent & dailyRent Residents
    stayDetails: {
      // Common fields
      propertyId: mongoose.Schema.Types.ObjectId,
      propertyName: String,
      sharingType: String,
      roomNumber: String,
      roomId: mongoose.Schema.Types.ObjectId,

      //For MonthlyRent
      depositAmountPaid: { type: Number, default: 0 },
      nonRefundableDeposit: Number,
      refundableDeposit: Number,
      depositStatus: {
        type: String,
        enum: ["pending", "paid", "refunded"],
        default: "pending",
      },
      monthlyRent: Number,
      joinDate: { type: Date, default: Date.now },

      //For DailyRent
      dailyRent: Number,
      checkInDate: Date,
      checkOutDate: Date,
      noOfDays: Number,
      extendedDays: Number,
      extendDate: Date,
    },

    // Kitchen/Mess details (for MessOnly users)
    messDetails: {
      kitchenId: mongoose.Schema.Types.ObjectId,
      kitchenName: String,
      mealType: {
        type: [String],
        enum: ["breakfast", "lunch", "dinner"],
      },
      rent: Number,
      messStartDate: {
        type: Date,
      },
      messEndDate: {
        type: Date,
      },
      noOfDays: Number,
      extendedDays: Number,
      extendDate: Date,
    },

    // Financial details
    financialDetails: {
      // For Monthly-Rent
      monthlyRent: { type: Number, default: 0 },
      pendingRent: { type: Number, default: 0 },
      accountBalance: { type: Number, default: 0 },
      nextDueDate: { type: Date },
      clearedTillMonth: { type: String },
      paymentDueSince: { type: Date },

      // For Daily-Rent & Mess-Only
      totalAmount: { type: Number, default: 0 },
      pendingAmount: { type: Number, default: 0 },

      fines: [
        {
          amount: { type: Number, required: true },
          reason: { type: String, required: true },
          dateIssued: { type: Date, default: Date.now },
          paid: { type: Boolean, default: false },
        },
      ],
    },

    // Payment and status
    paymentStatus: {
      type: String,
      default: "pending",
      enum: ["pending", "paid"],
    },

    currentStatus: {
      type: String,
      enum: ["checked_in", "on_leave", "checked_out"],
      default: "checked_in",
    },

    // Status requests
    statusRequests: [
      {
        type: {
          type: String,
          enum: ["checked_in", "on_leave", "checked_out"],
        },
        requestedAt: {
          type: Date,
          default: Date.now,
        },
        status: {
          type: String,
          enum: ["pending", "approved", "rejected"],
          default: "pending",
        },
        reason: String,
        reviewerComment: String,
        reviewedAt: Date,
        reviewedBy: String,

        effectiveDate: Date,
        isInstantCheckout: {
          type: Boolean,
          default: false,
        },
        isRefundEligible: {
          type: Boolean,
          default: false,
        },
      },
    ],
    currentStatusRequest: {
      type: {
        type: String,
        enum: ["checked_in", "on_leave", "checked_out"],
      },
      status: {
        type: String,
        enum: ["pending", "approved", "rejected"],
      },
    },

    // Referral system (Updated to match model)
    referralInfo: {
      type: new mongoose.Schema(
        {
          isReferralProcessed: { type: Boolean, default: false },
          referralCode: {
            type: String,
            unique: true,
            sparse: true,
          },
          referredByCode: { type: String },
          referralHistory: {
            referredUsers: [String],
            lastUsed: Date,
          },
          currentLevel: { type: Number, default: 0 }, // Changed from 'level' to 'currentLevel'
          totalReferrals: { type: Number, default: 0 },
          referralEarnings: { type: Number, default: 0 },
          availableBalance: { type: Number, default: 0 }, // Added
          withdrawnAmount: { type: Number, default: 0 },
        },
        { _id: false }
      ),
      default: {},
    },

    // Agent Fields (Added to match model)
    agent: {
      type: mongoose.Schema.Types.ObjectId,
      required: false,
    },
    commissionEarned: { type: Number, default: 0 },

    // Reminders and notifications
    rentReminder: {
      daysLeft: { type: Number, default: null },
      message: { type: String, default: "" },
    },

    // User permissions and status flags
    isApproved: { type: Boolean, default: false },
    isVerified: { type: Boolean, default: false },
    isLoginEnabled: { type: Boolean, default: false },
    isBlocked: { type: Boolean, default: false },
    isAccessBlockExtendDate: Date,
    isVacated: { type: Boolean, default: false },
    isHeavens: { type: Boolean, default: false },
    isColiving: { type: Boolean, default: false }, // Added
    vacatedAt: Date,

    // Profile completion
    profileCompletion: { type: Number, required: true, default: 10 },

    // Authentication tokens
    resetPasswordToken: String,
    resetPasswordExpires: Date,
    emailVerificationToken: String,
    emailVerificationExpires: Date,

    // Admin fields
    approvedByName: String,
    updatedByName: String,

    // Device tokens for notifications
    fcmTokens: [String],

    // Stay history for tracking multiple stays
    serviceHistory: [
      {
        userType: String,
        rentType: String,
        propertyName: String,
        kitchenName: String,
        sharingType: String,
        roomNumber: String,
        nonRefundableDeposit: Number,
        refundableDeposit: Number,
        depositAmountPaid: Number,
        rent: Number,
        serviceStartDate: Date,
        serviceEndDate: Date,
        reason: String,
        _id: false,
      },
    ],
    notes: String,

    // Gaming (Added to match model)
    gaming: {
      gamePlayed: { type: Boolean, default: false },
      gameCompleted: { type: Boolean, default: false },
      gameActive: { type: Boolean, default: false },
    },
  },
  {
    timestamps: true,
    discriminatorKey: "userType",
  }
);

// 2. Payment Schema (Matches models/feePayments.model.js)
const paymentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    rentType: { type: String, required: true },
    userType: { type: String, required: true },
    contact: { type: String, required: true },
    room: { type: String, required: true },
    rent: { type: Number, required: true },
    amount: { type: Number, required: true }, // Payment amount
    dueAmount: { type: Number, required: false }, // Changed to false to be safe
    waveOffAmount: { type: Number, required: false },
    referralAmountUsed: { type: Number, required: false }, // Added
    waveOffReason: { type: String, required: false },
    accountBalance: { type: Number, required: true },
    advanceApplied: { type: Number, default: 0 }, // How much credit was used for this payment
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
    receiptNumber: { type: String },
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
  { timestamps: true }
);

/**
 * Main function to perform the update logic across two databases.
 */
const updateAcrossDatabases = async () => {
  console.log("🚀 Starting user financial details update script...");

  let userDbConnection;
  let paymentDbConnection;

  try {
    // 1. Establish connections to both databases
    console.log("Connecting to databases...");
    userDbConnection = await mongoose
      .createConnection(USERS_DB_URI)
      .asPromise();
    paymentDbConnection = await mongoose
      .createConnection(PAYMENTS_DB_URI)
      .asPromise();
    console.log(
      "✅ Successfully connected to both User and Payment databases."
    );

    // 2. Register models on their respective connections
    const User = userDbConnection.model("User", userSchema);
    const Payments = paymentDbConnection.model("Payments", paymentSchema);

    let updatedCount = 0;
    let skippedCount = 0;

    // 3. Fetch all relevant users from the User database
    const users = await User.find({
      rentType: "monthly",
      isVacated: false,
    });
    // Removed .select() restriction so we fetch the FULL document.
    // This ensures we don't accidentally erase fields if we save the document back.

    console.log(
      `🔍 Found ${users.length} monthly rent users to process from the Users DB.`
    );

    // 4. Iterate over each user
    for (const user of users) {
      // 5. Find the latest payment for this user from the Payments database
      const latestPayment = await Payments.findOne({
        userId: user._id, // This links the two collections
        status: "Paid",
      }).sort({ paymentDate: -1, _id: -1 });

      if (!latestPayment || !latestPayment.fullyClearedRentMonths?.length) {
        // console.log(`- Skipping user ${user.name} (${user.userId}): No valid payment found in Payments DB.`);
        skippedCount++;
        continue;
      }

      // 6. Determine the most recently cleared month
      const clearedMonths = latestPayment.fullyClearedRentMonths;
      const latestClearedMonthStr = clearedMonths[clearedMonths.length - 1];

      // 7. Calculate the next due date
      // Note: This parsing assumes format like "January 2024" or "2024-01"
      const lastClearedDate = new Date(Date.parse(latestClearedMonthStr));
      if (isNaN(lastClearedDate)) {
        console.warn(
          `- Skipping user ${user.name} (${user.userId}): Invalid date format: "${latestClearedMonthStr}"`
        );
        skippedCount++;
        continue;
      }

      const year = lastClearedDate.getFullYear();
      // `getMonth()` is 0-indexed (Jan=0), so add 1. `padStart` ensures two digits (e.g., '09').
      const month = String(lastClearedDate.getMonth() + 1).padStart(2, "0");
      const formattedClearedMonth = `${year}-${month}`;

      const nextDueDate = new Date(lastClearedDate);
      nextDueDate.setMonth(nextDueDate.getMonth() + 1);

      // Keep the day of month from the payment date?
      // This is specific logic from your provided script.
      nextDueDate.setDate(latestPayment.paymentDate.getDate());
      nextDueDate.setHours(0, 0, 0, 0);

      // 8. Update the user document in memory
      // Ensure financialDetails exists
      if (!user.financialDetails) {
        user.financialDetails = {};
      }

      user.financialDetails.clearedTillMonth = formattedClearedMonth;
      user.financialDetails.nextDueDate = nextDueDate;

      console.log(
        `- Preparing update for ${user.name} (${
          user.userId
        }): Cleared until ${latestClearedMonthStr}, Next due: ${nextDueDate.toLocaleDateString()}`
      );

      // 9. Save changes to the User database if not a dry run
      if (!IS_DRY_RUN) {
        await user.save();
      }
      updatedCount++;
    }

    console.log("\n--- Script Summary ---");
    if (IS_DRY_RUN) {
      console.log("🛠️ DRY RUN MODE: No changes were saved to the database.");
    }
    console.log(`✅ Users processed for update: ${updatedCount}`);
    console.log(`⏩ Users skipped: ${skippedCount}`);
    console.log("🎉 Script finished successfully!");
  } catch (error) {
    console.error("\n❌ An error occurred during the update process:", error);
  } finally {
    // 10. Disconnect from both databases
    if (userDbConnection) await userDbConnection.close();
    if (paymentDbConnection) await paymentDbConnection.close();
    console.log("🔌 Disconnected from all databases.");
  }
};

// Run the script
updateAcrossDatabases();
