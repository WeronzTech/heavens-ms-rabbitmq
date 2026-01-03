// import mongoose from "mongoose";

// // --- CONFIGURATION ---
// const USER_MONGO_URI =
//   "mongodb+srv://weronztech:YOsHNIqznJgGcnRX@cluster0.degplel.mongodb.net/userDB?retryWrites=true&w=majority";
// const ACCOUNTS_MONGO_URI =
//   "mongodb+srv://weronztech:YOsHNIqznJgGcnRX@cluster0.degplel.mongodb.net/accountsDB?retryWrites=true&w=majority";

// // --- DATABASE CONNECTIONS ---
// console.log("Connecting to databases...");
// const userConn = mongoose.createConnection(USER_MONGO_URI);
// const accountConn = mongoose.createConnection(ACCOUNTS_MONGO_URI);

// userConn.on("connected", () => console.log("✅ Connected to User DB"));
// accountConn.on("connected", () => console.log("✅ Connected to Accounts DB"));

// // --- SCHEMAS & MODELS ---

// // 1. Payment Schema (Simplified for Calculation)
// const paymentSchema = new mongoose.Schema(
//   {
//     name: { type: String, required: true },
//     rentType: { type: String, required: true },
//     userType: { type: String, required: true },
//     contact: { type: String, required: true },
//     amount: { type: Number, required: true }, // Payment amount
//     paymentMethod: { type: String, required: true },
//     paymentDate: { type: Date, default: Date.now },
//     status: { type: String, enum: ["Paid", "Pending"], default: "Pending" },
//     userId: { type: mongoose.Schema.Types.ObjectId, required: true },
//     // ... other fields omitted for brevity as they aren't used in calculation
//   },
//   { timestamps: true }
// );

// const Payments = accountConn.model("Payments", paymentSchema);

// // 2. User Schema (Simplified: Removed DatabaseCounter/Pre-save hooks)
// const userSchema = new mongoose.Schema(
//   {
//     userId: { type: String, unique: true },
//     userType: { type: String, required: true },
//     rentType: { type: String, required: true },
//     name: { type: String },
//     contact: { type: String, required: true },

//     // Stay details - for monthlyRent & dailyRent Residents
//     stayDetails: {
//       joinDate: { type: Date, default: Date.now },
//       monthlyRent: Number,
//       rent: Number,
//       depositAmountPaid: { type: Number, default: 0 }, // Added to capture deposit
//       // ... other stay fields
//     },

//     // Financial details
//     financialDetails: {
//       monthlyRent: { type: Number, default: 0 },
//       pendingRent: { type: Number, default: 0 },
//       clearedTillMonth: { type: String },
//       // ... other financial fields
//     },

//     isVacated: { type: Boolean, default: false },
//     paymentStatus: { type: String, default: "pending" },
//   },
//   { timestamps: true, discriminatorKey: "userType" }
// );

// const User = userConn.model("User", userSchema);

// // --- LOGIC: CALCULATION FUNCTION ---

// /**
//  * Calculates pending rent for a monthly user by comparing
//  * total expected rent (since join date) vs total payments made.
//  *
//  * @param {string} userId - The Mongoose ObjectId of the user
//  */
// const calculateMonthlyUserStatus = async (userId) => {
//   try {
//     // 1. Fetch the User
//     const user = await User.findById(userId);

//     if (!user) {
//       console.log("❌ User not found.");
//       return;
//     }

//     // Filter for monthly users only
//     if (user.rentType !== "monthly" && user.rentType !== "Monthly") {
//       console.log(
//         `⚠️ User ${user.name} is not a Monthly tenant (Type: ${user.rentType}). Skipping.`
//       );
//       return;
//     }

//     console.log(`\n========= FINANCIAL AUDIT: ${user.name} =========`);
//     console.log(`User ID: ${user.userId}`);
//     console.log(
//       `Join Date: ${new Date(user.stayDetails.joinDate).toDateString()}`
//     );

//     // 2. Fetch all successful payments for this user from Accounts DB
//     const paymentRecords = await Payments.find({
//       userId: user._id, // Matches the ObjectId
//       status: "Paid",
//     });

//     // 3. Calculate Total Paid Amount
//     const totalPaid = paymentRecords.reduce((acc, doc) => acc + doc.amount, 0);

//     // Get Deposit Amount
//     const depositAmount = user.stayDetails.depositAmountPaid || 0;

//     // 4. Calculate Expected Rent (Since Join Date till Now)
//     const monthlyRent =
//       user.stayDetails.monthlyRent || user.financialDetails.monthlyRent || 0;
//     const joinDate = new Date(user.stayDetails.joinDate);
//     const currentDate = new Date();

//     let expectedTotalRent = 0;
//     let monthsCounted = 0;

//     // Logic: Iterate month by month starting from the Join Date.
//     // This ensures rent is calculated for the joining month immediately.
//     let iteratorDate = new Date(joinDate);

//     // Loop while the iterator date is strictly less than or equal to current date
//     while (iteratorDate <= currentDate) {
//       expectedTotalRent += monthlyRent;
//       monthsCounted++;

//       // Move to next month for next iteration
//       iteratorDate.setMonth(iteratorDate.getMonth() + 1);
//     }

//     // 5. Calculate Pending Amount
//     // Formula: Expected Rent - (Total Payments + Deposit Paid)
//     const calculatedPending = expectedTotalRent - (totalPaid - depositAmount);

//     // 6. Compare with DB Values
//     const dbPendingRent = user.financialDetails.pendingRent || 0;
//     const dbClearedTill = user.financialDetails.clearedTillMonth || "Not Set";

//     // 7. Console Log Results
//     console.log("\n--- CREDITS (Payments + Deposit) ---");
//     console.log(`Total Payment Records Found: ${paymentRecords.length}`);
//     console.log(`Total Payments Made: ₹${totalPaid.toLocaleString()}`);
//     console.log(`Deposit Amount Adjusted: ₹${depositAmount.toLocaleString()}`);
//     console.log(
//       `TOTAL CREDIT APPLIED: ₹${(totalPaid - depositAmount).toLocaleString()}`
//     );

//     console.log("\n--- EXPECTED RENT CALCULATION ---");
//     console.log(`Monthly Rent Rate: ₹${monthlyRent.toLocaleString()}`);
//     console.log(`Months passed (Inc. Joining Month): ${monthsCounted}`);
//     console.log(
//       `Total Expected Rent (Lifetime): ₹${expectedTotalRent.toLocaleString()}`
//     );

//     console.log("\n--- FINAL STATUS ---");
//     console.log(`Database says 'Cleared Till': ${dbClearedTill}`);
//     console.log(
//       `Database says 'Pending Rent': ₹${dbPendingRent.toLocaleString()}`
//     );
//     console.log(`-------------------------------------------`);

//     if (calculatedPending > 0) {
//       console.log(
//         `🚨 CALCULATED PENDING DUES: ₹${calculatedPending.toLocaleString()}`
//       );
//     } else if (calculatedPending < 0) {
//       console.log(
//         `✅ USER HAS EXCESS CREDIT: ₹${Math.abs(
//           calculatedPending
//         ).toLocaleString()}`
//       );
//     } else {
//       console.log(`✅ ALL DUES CLEARED EXACTLY.`);
//     }

//     // Variance Check
//     const variance = dbPendingRent - calculatedPending;
//     if (variance !== 0) {
//       console.log(
//         `⚠️ DISCREPANCY DETECTED: Database differs from calculation by ₹${Math.abs(
//           variance
//         ).toLocaleString()}`
//       );
//     }

//     console.log("==================================================\n");
//   } catch (error) {
//     console.error("Error calculating financials:", error);
//   }
// };

// // --- EXECUTION BLOCK ---
// const run = async () => {
//   try {
//     // Wait for connections to be ready
//     await Promise.all([
//       new Promise((resolve) => userConn.once("open", resolve)),
//       new Promise((resolve) => accountConn.once("open", resolve)),
//     ]);

//     // !!! REPLACE WITH A VALID USER ID FROM YOUR DATABASE !!!
//     const targetUserId = "692c0f6356a329253ee4ee5e";

//     await calculateMonthlyUserStatus(targetUserId);
//   } catch (err) {
//     console.error(err);
//   } finally {
//     // Close connections
//     await userConn.close();
//     await accountConn.close();
//     console.log("Connections closed.");
//     process.exit(0);
//   }
// };

// run();
import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// --- CONFIGURATION ---
const USER_MONGO_URI =
  "mongodb+srv://weronztech:YOsHNIqznJgGcnRX@cluster0.degplel.mongodb.net/userDB?retryWrites=true&w=majority";
const ACCOUNTS_MONGO_URI =
  "mongodb+srv://weronztech:YOsHNIqznJgGcnRX@cluster0.degplel.mongodb.net/accountsDB?retryWrites=true&w=majority";

const OUTPUT_FILE = "pending_rent_report.csv";
const UPDATE_DB = true;

// --- DATABASE CONNECTIONS ---
console.log("Connecting to databases...");
const userConn = mongoose.createConnection(USER_MONGO_URI);
const accountConn = mongoose.createConnection(ACCOUNTS_MONGO_URI);

userConn.on("connected", () => console.log("✅ Connected to User DB"));
accountConn.on("connected", () => console.log("✅ Connected to Accounts DB"));

// --- SCHEMAS & MODELS ---

// 1. Payment Schema
const paymentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    rentType: { type: String, required: true },
    userType: { type: String, required: true },
    contact: { type: String, required: true },
    amount: { type: Number, required: true },
    paymentMethod: { type: String, required: true },
    paymentDate: { type: Date, default: Date.now },
    status: { type: String, enum: ["Paid", "Pending"], default: "Pending" },
    userId: { type: mongoose.Schema.Types.ObjectId, required: true },
  },
  { timestamps: true }
);

const Payments = accountConn.model("Payments", paymentSchema);

// 2. User Schema
const userSchema = new mongoose.Schema(
  {
    userId: { type: String, unique: true },
    userType: { type: String, required: true },
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
      clearedTillMonth: { type: String },
    },

    isVacated: { type: Boolean, default: false },
    paymentStatus: { type: String, default: "pending" },
  },
  { timestamps: true, discriminatorKey: "userType" }
);

const User = userConn.model("User", userSchema);

// --- LOGIC: BULK CALCULATION ---

const generateReport = async () => {
  try {
    // 1. Fetch Target Users
    console.log("Fetching active monthly users...");
    const users = await User.find({
      isVacated: false,
      // Case-insensitive check for 'monthly'
      rentType: { $regex: /^monthly$/i },
    });

    console.log(`Found ${users.length} active monthly users.`);
    console.log("Starting calculations...");

    // 2. Prepare CSV Header
    const csvRows = [];
    csvRows.push(
      [
        "User Name",
        "User ID (Custom)",
        "User Object ID",
        "Phone",
        "Cleared Till (DB)",
        "Pending Rent (DB)",
        "Monthly Rent",
        "Deposit Amount",
        "Total Paid (All Payments)",
        "Expected Rent (Lifetime)",
        "Corrected Pending (Rent - Paid - Deposit)",
        "Variance (DB - Corrected)",
        "Update Status",
      ].join(",")
    );

    const currentDate = new Date();

    // 3. Process Each User
    for (const user of users) {
      try {
        // A. Basic Info
        const monthlyRent =
          user.stayDetails.monthlyRent ||
          user.financialDetails.monthlyRent ||
          0;
        const joinDate = new Date(user.stayDetails.joinDate);
        const depositAmount = user.stayDetails.depositAmountPaid || 0;

        // B. Fetch Payments
        const paymentRecords = await Payments.find({
          userId: user._id,
          status: "Paid",
        });

        const totalPaid = paymentRecords.reduce(
          (acc, doc) => acc + doc.amount,
          0
        );

        // C. Calculate Expected Rent
        // Logic: Count COMPLETED months only.
        // Start counting from the FIRST ANNIVERSARY (Join Date + 1 Month).
        // If Join Date = Nov 15, Iterator Starts Dec 15.
        // If Current Date = Dec 14, Loop doesn't run (0 months).
        // If Current Date = Dec 15, Loop runs once (1 month).

        let expectedTotalRent = 0;
        let monthsCounted = 0;
        let iteratorDate = new Date(joinDate);

        // Move iterator to the next month immediately
        iteratorDate.setMonth(iteratorDate.getMonth() + 1);

        // While the iterator date (monthly anniversary) is in the past or today
        while (iteratorDate <= currentDate) {
          expectedTotalRent += monthlyRent;
          monthsCounted++;
          iteratorDate.setMonth(iteratorDate.getMonth() + 1);
        }

        // D. Calculate Corrected Pending
        // Formula: Expected Rent - Total Payments - Deposit
        const correctedPending =
          expectedTotalRent - (totalPaid - depositAmount);

        // E. DB Values for comparison
        const dbPending = user.financialDetails.pendingRent || 0;
        const clearedTill = user.financialDetails.clearedTillMonth || "Not Set";

        let updateStatus = "Skipped";

        // --- UPDATE LOGIC START ---
        if (UPDATE_DB) {
          // Check if correction is needed to avoid redundant writes
          if (dbPending !== correctedPending) {
            // await User.updateOne(
            //   { _id: user._id },
            //   { $set: { "financialDetails.pendingRent": correctedPending } }
            // );
            // updateStatus = "Updated";
            console.log(
              `✏️  Updated ${user.name}: Pending Rent changed from ${dbPending} to ${correctedPending} expected rent ${expectedTotalRent} months counted ${monthsCounted} total paid ${totalPaid} deposit ${depositAmount}`
            );
          } else {
            updateStatus = "No Change Needed";
            console.log(`ℹ️  ${user.name} is correct.`);
          }
        }
        // --- UPDATE LOGIC END ---

        // F. Add to CSV Row
        const safeName = `"${(user.name || "Unknown").replace(/"/g, '""')}"`;
        const safeCleared = `"${clearedTill.replace(/"/g, '""')}"`;

        const row = [
          safeName,
          user.userId,
          user._id.toString(),
          user.contact,
          safeCleared,
          dbPending,
          monthlyRent,
          depositAmount,
          totalPaid,
          expectedTotalRent,
          correctedPending,
          dbPending - correctedPending, // Variance
          updateStatus,
        ].join(",");

        csvRows.push(row);
      } catch (userError) {
        console.error(
          `Error processing user ${user.userId}:`,
          userError.message
        );
      }
    }

    // 4. Write to File
    const csvContent = csvRows.join("\n");
    const filePath = path.resolve(OUTPUT_FILE);

    fs.writeFileSync(filePath, csvContent);

    console.log(`\n✅ Report generated successfully!`);
    console.log(`📂 File saved at: ${filePath}`);
    console.log(`Total Users Processed: ${users.length}`);
  } catch (error) {
    console.error("Fatal Error:", error);
  }
};

const RESTORE_DATA = [
  { name: "Sherry Reji Geevarghese", targetRent: 6500 },
  { name: "Adish V S", targetRent: 6500 },
  { name: "Misbahudeen MT ", targetRent: 13000 },
  { name: "Selva Ganesh", targetRent: 8500 },
  { name: "Arundev PB ", targetRent: 6500 },
  { name: "Jibin MJ", targetRent: 6500 },
  { name: "Edith Antony", targetRent: 6500 },
  { name: "Akhil Unni", targetRent: 6500 },
  { name: "Aswin KA", targetRent: 6500 },
  { name: "Albert Sabu", targetRent: 13000 },
  { name: "Joyal Biju ", targetRent: 6500 },
  { name: "Muhammed Suhail S", targetRent: 13000 },
  { name: "Al Ameen NJ", targetRent: 6500 },
  { name: "Muhammad Asif N S", targetRent: 6500 },
  { name: "Vishnu K K", targetRent: 6500 },
  { name: "Mohamed Shefin TP", targetRent: 6500 },
  { name: "Sanoop S", targetRent: 6500 },
  { name: "Wanphrangki Paswet", targetRent: 0 },
  { name: "Greena K A", targetRent: 6500 },
  { name: "Saniya M K", targetRent: 6500 },
  { name: "Anugraha C D", targetRent: 6500 },
  { name: "Aparna PP", targetRent: 6500 },
  { name: "Athira P", targetRent: 6500 },
  { name: "Devika KR", targetRent: 6500 },
  { name: "Archana Ashok", targetRent: 6500 },
  { name: "Lavanya Vinod", targetRent: 6500 },
  { name: "Jose Sojan", targetRent: 26000 },
  { name: "Ayoobkhan ", targetRent: 19500 },
  { name: "Suriya Prasanth", targetRent: 7500 },
  { name: "Devika", targetRent: 0 },
  { name: "Amjath Cherayil", targetRent: 0 },
  { name: "Devika Rajesh", targetRent: 6500 },
  { name: "Shilpa Jayan", targetRent: 6500 },
  { name: "Tulasi gouda ", targetRent: 6500 },
  { name: "Anjali S", targetRent: 6250 },
  { name: "Karthika S", targetRent: 6250 },
  { name: "Reshma A", targetRent: 6500 },
  { name: "Navya S", targetRent: 13000 },
  { name: "Anagha U K", targetRent: 6500 },
  { name: "Hamna Shirin", targetRent: 6500 },
  { name: "K Dolly Priyanka", targetRent: 6500 },
  { name: "Anto Biju", targetRent: 0 },
  { name: "Anand ns", targetRent: 45500 },
  { name: "Shifana ", targetRent: 0 },
  { name: "Vinotha", targetRent: 0 },
  { name: "Sahana ", targetRent: 0 },
  { name: "Srikar vineeth", targetRent: 7000 },
  { name: "Ankit", targetRent: 0 },
  { name: "Jishna E", targetRent: 6500 },
  { name: "Prajith Krishnan", targetRent: 0 },
  { name: "Alan Philip", targetRent: 0 },
  { name: "Jazeer Jamal", targetRent: 0 },
  { name: "Gokul M K", targetRent: 6500 },
  { name: "Sinan E K", targetRent: 6500 },
  { name: "Sravan Chandran", targetRent: 26000 },
  { name: "Muhammed Salikh", targetRent: 6500 },
  { name: "Salmanul Faris", targetRent: 13000 },
  { name: "Fathima Hanna", targetRent: 13000 },
  { name: "Alin Mary Sunny", targetRent: 0 },
  { name: "Hanna Mehabin", targetRent: 6500 },
  { name: "Muhammed Anees Hayath", targetRent: 6500 },
  { name: "Afnan Fayan K T", targetRent: 6500 },
  { name: "Mohammed Jiyad N", targetRent: 0 },
  { name: "vaitheeswari saravanan", targetRent: 0 },
  { name: "Shamil M", targetRent: 19500 },
  { name: "Afuw M V", targetRent: 26000 },
  { name: "Alan shanil", targetRent: 0 },
  { name: "Faisal", targetRent: 19500 },
  { name: "Abhinand G S", targetRent: 0 },
  { name: "Muhammed Hafnan V K", targetRent: 6500 },
  { name: "Muhammed Sinan V K", targetRent: 0 },
  { name: "Abhijeeth Raveendran", targetRent: 40000 },
  { name: "Aadith T k", targetRent: 13000 },
  { name: "Muhammed shafin", targetRent: 26000 },
  { name: "Haneen TF", targetRent: 13000 },
  { name: "Muhammed Abdul Basith", targetRent: 26000 },
  { name: "Muhammed Ramees KK", targetRent: 19500 },
  { name: "Aswin P", targetRent: 6500 },
  { name: "Nila kanmani", targetRent: 0 },
  { name: "Mathew Santhosh", targetRent: 0 },
  { name: "Muhammed Nidan C", targetRent: 6500 },
  { name: "L chethan kumar", targetRent: 9000 },
  { name: "Akshay Sonu ", targetRent: 21000 },
  { name: "ibalarikynti Sten", targetRent: 8000 },
  { name: "Jithin N", targetRent: 8000 },
  { name: "Dilshith", targetRent: 0 },
  { name: "Akash Prakash", targetRent: 0 },
  { name: "John Wick", targetRent: 9800 },
  { name: "Gokul S", targetRent: 0 },
  { name: "Nikhil", targetRent: 0 },
  { name: "Aditya Kalburgi", targetRent: 0 },
];

// --- LOGIC: REVERT DATA ---

const revertData = async () => {
  try {
    console.log("Starting data reversion based on provided logs...");
    let updatedCount = 0;
    let errorCount = 0;

    for (const item of RESTORE_DATA) {
      try {
        // Find user by Exact Name (and ensure not vacated to be safe, though name should suffice)
        const user = await User.findOne({
          name: item.name,
          rentType: { $regex: /^monthly$/i },
        });

        if (!user) {
          console.log(`❌ User NOT FOUND: "${item.name}" - Skipping.`);
          errorCount++;
          continue;
        }

        const currentRent = user.financialDetails.pendingRent;

        // Only update if different
        if (currentRent !== item.targetRent) {
          await User.updateOne(
            { _id: user._id },
            { $set: { "financialDetails.pendingRent": item.targetRent } }
          );
          console.log(
            `✅ REVERTED ${item.name}: ${currentRent} -> ${item.targetRent}`
          );
          updatedCount++;
        } else {
          console.log(
            `ℹ️  No Change Needed for ${item.name} (Already ${item.targetRent})`
          );
        }
      } catch (err) {
        console.error(`Error processing ${item.name}:`, err.message);
        errorCount++;
      }
    }

    console.log("\n==========================================");
    console.log(`Reversion Complete.`);
    console.log(`Updated: ${updatedCount}`);
    console.log(`Errors/Not Found: ${errorCount}`);
    console.log("==========================================");
  } catch (error) {
    console.error("Fatal Error:", error);
  }
};

// --- EXECUTION BLOCK ---
const run = async () => {
  try {
    await Promise.all([
      new Promise((resolve) => userConn.once("open", resolve)),
      new Promise((resolve) => accountConn.once("open", resolve)),
    ]);

    // await revertData();
    await generateReport();
  } catch (err) {
    console.error(err);
  } finally {
    await userConn.close();
    await accountConn.close();
    console.log("Connections closed.");
    process.exit(0);
  }
};

run();
