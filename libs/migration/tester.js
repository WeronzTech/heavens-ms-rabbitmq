import mongoose from "mongoose";

// --- CONFIGURATION ---
const USER_MONGO_URI =
  "mongodb+srv://weronztech:YOsHNIqznJgGcnRX@cluster0.degplel.mongodb.net/userDB?retryWrites=true&w=majority";

// SET THIS TO TRUE TO APPLY CHANGES TO DB
const UPDATE_DB = false;

// --- DATABASE CONNECTION ---
console.log("Connecting to User Database...");
const userConn = mongoose.createConnection(USER_MONGO_URI);

userConn.on("connected", () => console.log("✅ Connected to User DB"));

// --- USER SCHEMA (Simplified) ---
const userSchema = new mongoose.Schema(
  {
    rentType: { type: String, required: true },
    name: { type: String },
    contact: { type: String, required: true },

    stayDetails: {
      joinDate: { type: Date, default: Date.now },
      monthlyRent: Number,
      rent: Number,
      depositAmountPaid: { type: Number, default: 0 },
    },

    financialDetails: {
      monthlyRent: { type: Number, default: 0 },
      pendingRent: { type: Number, default: 0 },
      pendingAmount: { type: Number, default: 0 },
      clearedTillMonth: { type: String },
    },

    isVacated: { type: Boolean, default: false },
  },
  { strict: false } // Allow other fields to exist without defining them
);

const User = userConn.model("User", userSchema);

// --- SYNC FUNCTION ---
const syncPendingRentToAmount = async () => {
  try {
    console.log("Fetching all users...");
    const users = await User.find({
      rentType: "monthly",
      isVacated: false,
      // isBlocked: false,
      "financialDetails.clearedTillMonth": { $exists: true, $ne: null },
    });
    console.log(`Total users found: ${users.length}`);

    let updatedCount = 0;
    const changedUsers = [];

    for (const user of users) {
      // Safely access fields, defaulting to 0 if undefined/null
      const pRent = user.financialDetails?.pendingRent || 0;
      const pAmount = user.financialDetails?.pendingAmount || 0;

      // Check for discrepancy
      if (pRent !== pAmount && pAmount !== 0) {
        // Log the change
        const message = `${
          user.name || "Unknown"
        }: pendingRent (${pRent}) -> pendingAmount (${pAmount})`;
        console.log(`Mismatch found: ${message}`);
        changedUsers.push(message);

        if (UPDATE_DB) {
          // Update pendingRent to match pendingAmount
          // We use $set to ensure we don't overwrite other parts of financialDetails accidentally
          await User.updateOne(
            { _id: user._id },
            { $set: { "financialDetails.pendingRent": pAmount } }
          );
          updatedCount++;
        }
      }
    }

    console.log("\n==========================================");
    console.log("SYNC COMPLETE");
    console.log("==========================================");
    console.log(`Total Mismatches Found: ${changedUsers.length}`);
    if (UPDATE_DB) {
      console.log(`Total Users Updated in DB: ${updatedCount}`);
    } else {
      console.log(
        `Total Users Updated: 0 (Dry Run - Set UPDATE_DB = true to apply)`
      );
    }
    console.log("------------------------------------------");

    if (changedUsers.length > 0) {
      console.log("Users Changed:");
      changedUsers.forEach((u) => console.log(` - ${u}`));
    }
  } catch (error) {
    console.error("Fatal Error:", error);
  }
};

// --- EXECUTION BLOCK ---
const run = async () => {
  try {
    // Wait for connection
    await new Promise((resolve) => userConn.once("open", resolve));

    await syncPendingRentToAmount();
  } catch (err) {
    console.error(err);
  } finally {
    await userConn.close();
    console.log("Connection closed.");
    process.exit(0);
  }
};

run();
