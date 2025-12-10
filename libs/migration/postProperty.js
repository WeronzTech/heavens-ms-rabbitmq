// /**
//  * Mongoose Post-Migration Script - Link Users to Rooms
//  *
//  * This script runs AFTER all User and Room data has been migrated. It iterates
//  * over the new 'users' collection and populates the 'roomOccupants' array in the
//  * new 'rooms' collection based on the foreign key references stored in the User documents.
//  */

// import mongoose from "mongoose";

// // =========================================================================================
// // 1. CONFIGURATION
// // =========================================================================================

// // --- TARGET DATABASE (All new data is here) ---
// const ROOM_MONGO_URI =
//   "mongodb+srv://weronztech:YOsHNIqznJgGcnRX@cluster0.degplel.mongodb.net/propertyDB?retryWrites=true&w=majority"; // <-- UPDATE THIS
// const USER_MONGO_URI =
//   "mongodb+srv://weronztech:YOsHNIqznJgGcnRX@cluster0.degplel.mongodb.net/userDB?retryWrites=true&w=majority"; // <-- UPDATE THIS

// const BATCH_SIZE = 100;

// // =========================================================================================
// // 2. SCHEMA DEFINITIONS (Required for linking)
// // =========================================================================================

// // New User Schema (Minimal definition for required fields)
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
//     name: { type: String },
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
//       contact: String,
//       occupation: String,
//     },
//     studyDetails: {
//       course: String,
//       institution: String,
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
//       depositStatus: { type: String, default: "pending" },
//       monthlyRent: Number,
//       joinDate: { type: Date },
//       dailyRent: Number,
//       checkInDate: Date,
//       checkOutDate: Date,
//       noOfDays: Number,
//     },
//     financialDetails: {
//       monthlyRent: { type: Number, default: 0 },
//       pendingRent: { type: Number, default: 0 },
//       accountBalance: { type: Number, default: 0 },
//       totalAmount: { type: Number, default: 0 },
//       pendingAmount: { type: Number, default: 0 },
//     },
//     paymentStatus: { type: String, default: "pending" },
//     currentStatus: { type: String, default: "checked_in" },
//     isVerified: { type: Boolean, default: false },
//     isBlocked: { type: Boolean, default: false },
//     isVacated: { type: Boolean, default: false },
//     vacatedAt: Date,
//     profileCompletion: { type: Number, default: 10 },
//     isApproved: { type: Boolean, default: true },
//     isLoginEnabled: { type: Boolean, default: true },
//   },
//   { timestamps: true }
// );

// // New Room Schema (Minimal definition for required fields)
// const newRoomSchema = new mongoose.Schema(
//   {
//     propertyName: { type: String, required: true },
//     roomNo: { type: String, required: true },
//     sharingType: { type: String, required: true },
//     roomCapacity: { type: Number, required: true },
//     occupant: { type: Number, required: true },
//     vacantSlot: { type: Number, required: true },
//     status: { type: String, required: true },
//     propertyId: { type: mongoose.Schema.Types.ObjectId, ref: "Property" },
//     roomOccupants: [
//       {
//         userId: { type: mongoose.Schema.Types.ObjectId, required: false },
//         userType: {
//           type: String,
//           enum: ["longTermResident", "dailyRenter"],
//           required: false,
//         },
//         _id: false,
//       },
//     ],
//   },
//   { collection: "rooms" }
// );

// // =========================================================================================
// // 3. MAPPING LOGIC
// // =========================================================================================

// /**
//  * Maps the new User model's userType to the Room's occupant userType.
//  */
// function mapUserTypeToRoomOccupantType(userType) {
//   if (userType === "student") {
//     return "longTermResident";
//   }
//   if (userType === "dailyRent") {
//     return "dailyRenter";
//   }
//   return null; // Should not happen for migrated data
// }

// // =========================================================================================
// // 4. MIGRATION EXECUTION
// // =========================================================================================

// async function runPostMigrationLinker() {
//   let userConn, roomConn; // Two separate connection variables
//   let totalUsersProcessed = 0;
//   let totalRoomsUpdated = 0;
//   let totalError = 0;

//   try {
//     // 1. Establish Connections
//     console.log("Connecting to User Database (Source of Occupant Data)...");
//     userConn = await mongoose.createConnection(USER_MONGO_URI);
//     console.log("User Database connected successfully.");

//     console.log("Connecting to Room Database (Target for Updates)...");
//     roomConn = await mongoose.createConnection(ROOM_MONGO_URI);
//     console.log(
//       "Room Database connected successfully. Starting User-Room linking..."
//     ); // 2. Define Models on the correct connections

//     const TargetUser = userConn.model("User", userSchema);
//     const TargetRoom = roomConn.model("Room", newRoomSchema); // 3. Find all currently CHECKED_IN Users with a valid roomId

//     const userCursor = TargetUser.find({
//       "stayDetails.roomId": { $exists: true, $ne: null },
//       currentStatus: "checked_in",
//       isVacated: false,
//     })
//       .select("_id userType stayDetails.roomId")
//       .lean()
//       .cursor(); // 4. Group Users by RoomId to perform efficient bulk updates

//     const usersByRoom = {};
//     for (
//       let user = await userCursor.next();
//       user != null;
//       user = await userCursor.next()
//     ) {
//       totalUsersProcessed++; // We use the Mongoose ObjectId (_id) of the User as the link
//       const userId = user._id;
//       const roomId = user.stayDetails.roomId.toString();
//       const occupantType = mapUserTypeToRoomOccupantType(user.userType);

//       if (occupantType) {
//         if (!usersByRoom[roomId]) {
//           usersByRoom[roomId] = [];
//         }
//         usersByRoom[roomId].push({
//           userId: userId,
//           userType: occupantType,
//         });
//       }
//     } // 5. Perform the Bulk Update on the Rooms collection

//     console.log(
//       `\nFound ${totalUsersProcessed} checked-in users to link to ${
//         Object.keys(usersByRoom).length
//       } rooms.`
//     );
//     console.log("--- Starting Room Occupant Update ---");

//     const roomIds = Object.keys(usersByRoom);

//     for (const roomId of roomIds) {
//       const occupants = usersByRoom[roomId];
//       try {
//         // Use TargetRoom model on the roomConn connection
//         await TargetRoom.updateOne(
//           { _id: roomId },
//           { $set: { roomOccupants: occupants } }
//         );
//         totalRoomsUpdated++;
//       } catch (error) {
//         totalError++;
//         console.error(`Error updating Room ID: ${roomId}`, error.message);
//       }
//     }
//   } catch (error) {
//     console.error("\n*** FATAL POST-MIGRATION ERROR ***", error);
//   } finally {
//     if (userConn) {
//       await userConn.close();
//       console.log("User Database connection closed.");
//     }
//     if (roomConn) {
//       await roomConn.close();
//       console.log("Room Database connection closed.");
//     }
//     console.log("\n=========================================================");
//     console.log("ROOM OCCUPANT LINKING SUMMARY");
//     console.log(`Users Processed: ${totalUsersProcessed}`);
//     console.log(`Rooms Successfully Updated: ${totalRoomsUpdated}`);
//     console.log(`Rooms Failed to Update: ${totalError}`);
//     console.log("=========================================================");
//   }
// }

// // Execute the main function
// runPostMigrationLinker();
/**
 * Mongoose Post-Migration Script - Link Users to Rooms
 *
 * This script runs AFTER all User and Room data has been migrated. It iterates
 * over the new 'users' collection and populates the 'roomOccupants' array in the
 * new 'rooms' collection based on the foreign key references stored in the User documents.
 */

import mongoose from "mongoose";

// =========================================================================================
// 1. CONFIGURATION
// =========================================================================================

// --- TARGET DATABASE (All new data is here - usually the same DB for both collections) ---
// Note: Even if they are in the same DB, we use separate connection objects for clarity/safety.
const ROOM_MONGO_URI =
  "mongodb+srv://weronztech:YOsHNIqznJgGcnRX@cluster0.degplel.mongodb.net/propertyDB?retryWrites=true&w=majority"; // <-- UPDATE THIS
const USER_MONGO_URI =
  "mongodb+srv://weronztech:YOsHNIqznJgGcnRX@cluster0.degplel.mongodb.net/userDB?retryWrites=true&w=majority"; // <-- UPDATE THIS

const BATCH_SIZE = 100;

// =========================================================================================
// 2. SCHEMA DEFINITIONS (Required for linking)
// =========================================================================================

// --- User Schema (Matching models/user.model.js) ---
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
    // We only need fields relevant to room linking here
    stayDetails: {
      propertyId: mongoose.Schema.Types.ObjectId,
      propertyName: String,
      sharingType: String,
      roomNumber: String,
      roomId: mongoose.Schema.Types.ObjectId,
    },
    currentStatus: { type: String, default: "checked_in" },
    isVacated: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// --- Room Schema (Matching models/room.model.js) ---
const newRoomSchema = new mongoose.Schema(
  {
    propertyName: { type: String, required: true },
    roomNo: { type: String, required: true },
    sharingType: { type: String, required: true },
    roomCapacity: { type: Number, required: true },
    occupant: { type: Number, required: true },
    vacantSlot: { type: Number, required: true },
    status: { type: String, required: true },
    propertyId: { type: mongoose.Schema.Types.ObjectId, ref: "Property" },

    // The target field we are populating
    roomOccupants: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, required: false },
        userType: {
          type: String,
          enum: ["longTermResident", "dailyRenter"],
          required: false,
        },
        _id: false,
      },
    ],
  },
  { collection: "rooms" }
);

// =========================================================================================
// 3. MAPPING LOGIC
// =========================================================================================

/**
 * Maps the new User model's userType to the Room's occupant userType.
 */
function mapUserTypeToRoomOccupantType(userType) {
  if (userType === "student" || userType === "worker") {
    return "longTermResident";
  }
  if (userType === "dailyRent") {
    return "dailyRenter";
  }
  return null; // Should not happen for migrated data usually
}

// =========================================================================================
// 4. MIGRATION EXECUTION
// =========================================================================================

async function runPostMigrationLinker() {
  let userConn, roomConn; // Two separate connection variables
  let totalUsersProcessed = 0;
  let totalRoomsUpdated = 0;
  let totalError = 0;

  try {
    // 1. Establish Connections
    console.log("Connecting to User Database (Source of Occupant Data)...");
    userConn = await mongoose.createConnection(USER_MONGO_URI);
    console.log("User Database connected successfully.");

    console.log("Connecting to Room Database (Target for Updates)...");
    roomConn = await mongoose.createConnection(ROOM_MONGO_URI);
    console.log(
      "Room Database connected successfully. Starting User-Room linking..."
    );

    // 2. Define Models on the correct connections
    const TargetUser = userConn.model("User", userSchema);
    const TargetRoom = roomConn.model("Room", newRoomSchema);

    // 3. Find all currently CHECKED_IN Users with a valid roomId
    // We filter for users who are currently checked in and not vacated.
    const userCursor = TargetUser.find({
      "stayDetails.roomId": { $exists: true, $ne: null },
      currentStatus: "checked_in",
      isVacated: false,
    })
      .select("_id userType stayDetails.roomId")
      .lean()
      .cursor();

    // 4. Group Users by RoomId to perform efficient bulk updates
    const usersByRoom = {};

    for (
      let user = await userCursor.next();
      user != null;
      user = await userCursor.next()
    ) {
      totalUsersProcessed++;

      // We use the Mongoose ObjectId (_id) of the User as the link
      const userId = user._id;
      const roomId = user.stayDetails.roomId.toString();
      const occupantType = mapUserTypeToRoomOccupantType(user.userType);

      if (occupantType) {
        if (!usersByRoom[roomId]) {
          usersByRoom[roomId] = [];
        }

        usersByRoom[roomId].push({
          userId: userId,
          userType: occupantType,
        });
      }
    }

    // 5. Perform the Bulk Update on the Rooms collection
    console.log(
      `\nFound ${totalUsersProcessed} checked-in users to link to ${
        Object.keys(usersByRoom).length
      } rooms.`
    );
    console.log("--- Starting Room Occupant Update ---");

    const roomIds = Object.keys(usersByRoom);

    for (const roomId of roomIds) {
      const occupants = usersByRoom[roomId];
      try {
        // Use TargetRoom model on the roomConn connection

        // *** TRIAL RUN: Commented out actual write ***
        await TargetRoom.updateOne(
          { _id: roomId },
          {
            $set: {
              roomOccupants: occupants,
              // Optionally update occupant counts here if needed,
              // though usually calculated dynamically or during migration
              occupant: occupants.length,
            },
          }
        );

        console.log(
          `[TRIAL] Would update Room ID: ${roomId} with ${occupants.length} occupants.`
        );

        totalRoomsUpdated++;
      } catch (error) {
        totalError++;
        console.error(`Error updating Room ID: ${roomId}`, error.message);
      }
    }
  } catch (error) {
    console.error("\n*** FATAL POST-MIGRATION ERROR ***", error);
  } finally {
    if (userConn) {
      await userConn.close();
      console.log("User Database connection closed.");
    }
    if (roomConn) {
      await roomConn.close();
      console.log("Room Database connection closed.");
    }
    console.log("\n=========================================================");
    console.log("ROOM OCCUPANT LINKING SUMMARY");
    console.log(`Users Processed: ${totalUsersProcessed}`);
    console.log(`Rooms Successfully Updated: ${totalRoomsUpdated}`);
    console.log(`Rooms Failed to Update: ${totalError}`);
    console.log("=========================================================");
  }
}

// Execute the main function
runPostMigrationLinker();
