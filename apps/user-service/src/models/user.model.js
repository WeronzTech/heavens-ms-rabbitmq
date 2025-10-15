import mongoose from "mongoose";
import DatabaseCounter from "./databaseCounter.model.js";

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
    // The 'sparse' option is defined in the userSchema.index() call below
    residentId: { type: String },
    // The 'sparse' option is defined in the userSchema.index() call below
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
          // Removed 'index: true' from here to prevent duplicate index warning
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

    // Referral system
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
          currentLevel: { type: Number, default: 0 }, // UPDATED: Tracks the user's current referral level
          totalReferrals: { type: Number, default: 0 },
          referralEarnings: { type: Number, default: 0 },
          availableBalance: { type: Number, default: 0 }, // NEW: The spendable balance
          withdrawnAmount: { type: Number, default: 0 },
        },
        { _id: false }
      ),
      default: {},
    },

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
    gaming: {
      gamePlayed: { type: Boolean, default: false },
      gameCompleted: { type: Boolean, default: false },
      gameActive: { type: Boolean, default: false },
    },
  },
  {
    timestamps: true,
    // Add discriminator key for potential future sub-schemas
    discriminatorKey: "userType",
  }
);

// Indexes for performance optimization
userSchema.index({ userType: 1, rentType: 1 });
userSchema.index({ "stayDetails.propertyId": 1, isHeavens: 1 });
userSchema.index({ "stayDetails.roomId": 1 });
userSchema.index({ contact: 1 });
userSchema.index({ email: 1 }, { sparse: true });
userSchema.index({ residentId: 1 }, { sparse: true });
userSchema.index({ paymentStatus: 1, "financialDetails.nextDueDate": 1 });
userSchema.index({ currentStatus: 1, isVacated: 1 });
userSchema.index({ "messDetails.kitchenId": 1 }, { sparse: true });
userSchema.index({ "statusRequests.status": 1 });
userSchema.index({ "statusRequests.type": 1 });
userSchema.index({ "statusRequests.requestedAt": -1 });
userSchema.index({ userType: 1, "statusRequests.status": 1 });

userSchema.pre("save", async function (next) {
  try {
    if (this.isNew) {
      const now = new Date();
      const year = now.getFullYear().toString().slice(-2);
      const month = `0${now.getMonth() + 1}`.slice(-2);

      let counter = await DatabaseCounter.findOneAndUpdate(
        {
          type: "User",
          year: parseInt(year, 10),
          month: parseInt(month, 10),
        },
        { $inc: { count: 1 } },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );

      if (!counter) {
        throw new Error("Counter document could not be created or updated.");
      }

      const customId = `HVNS-U${year}${month}${counter.count}`;
      this.userId = customId;
    }
    next();
  } catch (error) {
    next(error);
  }
});

// Virtual for calculating current rent based on rent type
userSchema.virtual("currentRent").get(function () {
  switch (this.rentType) {
    case "Daily":
      return this.stayDetails?.dailyRent || this.stayDetails?.rent;
    case "Weekly":
      return this.stayDetails?.weeklyRent || this.stayDetails?.rent;
    case "Monthly":
      return (
        this.stayDetails?.monthlyRent ||
        this.financialDetails?.monthlyRent ||
        this.stayDetails?.rent
      );
    default:
      return this.stayDetails?.rent || 0;
  }
});

// Pre-save middleware to set appropriate rent values
userSchema.pre("save", function (next) {
  // Auto-set rent values based on rentType
  if (this.stayDetails?.rent) {
    switch (this.rentType) {
      case "Daily":
        this.stayDetails.dailyRent =
          this.stayDetails.dailyRent || this.stayDetails.rent;
        break;
      case "Weekly":
        this.stayDetails.weeklyRent =
          this.stayDetails.weeklyRent || this.stayDetails.rent;
        break;
      case "Monthly":
        this.stayDetails.monthlyRent =
          this.stayDetails.monthlyRent || this.stayDetails.rent;
        this.financialDetails.monthlyRent =
          this.financialDetails.monthlyRent || this.stayDetails.rent;
        break;
    }
  }

  // Set default values based on userType
  if (this.userType === "MessOnly") {
    this.rentType = this.rentType || "Monthly";
  }
  if (this.userType === "DailyRent") {
    this.rentType = "Daily";
  }

  next();
});

// Static method to get users by rent type
userSchema.statics.findByRentType = function (
  rentType,
  additionalFilters = {}
) {
  return this.find({ rentType, ...additionalFilters });
};

// Static method to get overdue payments
userSchema.statics.findOverduePayments = function () {
  return this.find({
    paymentStatus: { $in: ["Pending", "Overdue"] },
    "financialDetails.nextDueDate": { $lt: new Date() },
    isVacated: false,
  });
};

// Instance method to calculate total dues
userSchema.methods.calculateTotalDues = function () {
  return (
    (this.financialDetails?.pendingRent || 0) +
    (this.financialDetails?.monthlyRent || 0)
  );
};

const User = mongoose.model("User", userSchema);

export default User;
