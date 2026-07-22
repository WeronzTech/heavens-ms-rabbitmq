import mongoose from "mongoose";
import dotenv from "dotenv";

// Load environment variables from .env
dotenv.config();

const USER_MONGO_URI = process.env.USER_MONGO_URI;
const PROPERTY_MONGO_URI = process.env.PROPERTY_MONGO_URI;

if (!USER_MONGO_URI || !PROPERTY_MONGO_URI) {
  console.error("❌ Error: USER_MONGO_URI and PROPERTY_MONGO_URI must be defined in the .env file.");
  process.exit(1);
}

// Check for live mode flag
const LIVE_MODE = process.argv.includes("--live");

console.log("================================================================================");
console.log(`🚀 DB Occupants Correction Script starting in ${LIVE_MODE ? "LIVE" : "DRY (TRIAL)"} MODE`);
console.log("================================================================================");

// --- SCHEMA DEFINITIONS ---

// Minimal User Schema
const userSchema = new mongoose.Schema(
  {
    name: String,
    userId: String,
    userType: String,
    isVacated: { type: Boolean, default: false },
    isColiving: { type: Boolean, default: false },
    colivingPartner: {
      name: String,
      contact: String,
      email: String,
      relation: String,
    },
    stayDetails: {
      roomId: mongoose.Schema.Types.ObjectId,
      propertyName: String,
      roomNumber: String,
    },
  },
  { collection: "users" }
);

// Minimal Room Schema
const roomSchema = new mongoose.Schema(
  {
    propertyName: { type: String, required: true },
    roomNo: { type: String, required: true },
    sharingType: { type: String, required: true },
    roomCapacity: { type: Number, required: true },
    occupant: { type: Number, required: true },
    vacantSlot: { type: Number, required: true },
    roomOccupants: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, required: false },
        userType: String,
        _id: false,
      },
    ],
  },
  { collection: "rooms" }
);

/**
 * Maps the User model's userType to the Room's occupant userType.
 */
function mapUserTypeToRoomOccupantType(userType) {
  if (userType === "student" || userType === "worker") {
    return "longTermResident";
  }
  if (userType === "dailyRent") {
    return "dailyRenter";
  }
  return null;
}

async function runCorrection() {
  let userConn = null;
  let propertyConn = null;

  try {
    console.log("Connecting to User Database...");
    userConn = await mongoose.createConnection(USER_MONGO_URI);
    console.log("✅ Connected to User DB");

    console.log("Connecting to Property Database...");
    propertyConn = await mongoose.createConnection(PROPERTY_MONGO_URI);
    console.log("✅ Connected to Property DB");

    const User = userConn.model("User", userSchema);
    const Room = propertyConn.model("Room", roomSchema);

    // 1. Fetch non-vacated users who have a roomId
    console.log("\nFetching non-vacated users with active room assignments...");
    const activeUsers = await User.find({
      isVacated: { $ne: true },
      "stayDetails.roomId": { $exists: true, $ne: null },
    });

    console.log(`Found ${activeUsers.length} non-vacated users with a roomId.`);

    if (activeUsers.length === 0) {
      console.log("No active users with rooms found. Nothing to process.");
      return;
    }

    // Group active users by their roomId to check room occupants efficiently
    const usersByRoom = {};
    for (const user of activeUsers) {
      const roomId = user.stayDetails.roomId.toString();
      if (!usersByRoom[roomId]) {
        usersByRoom[roomId] = [];
      }
      usersByRoom[roomId].push(user);
    }

    const uniqueRoomIds = Object.keys(usersByRoom);
    console.log(`These users are mapped to ${uniqueRoomIds.length} unique rooms.\n`);

    let roomsChecked = 0;
    let roomsMismatched = 0;
    let roomsCorrected = 0;
    let errors = 0;

    for (const roomId of uniqueRoomIds) {
      const usersInRoom = usersByRoom[roomId];
      
      try {
        const room = await Room.findById(roomId);
        if (!room) {
          console.warn(`⚠️ Warning: Room with ID ${roomId} not found in Property DB (referenced by user(s): ${usersInRoom.map(u => `${u.name} (${u.userId})`).join(", ")}).`);
          continue;
        }

        roomsChecked++;

        // Cross-check if these non-vacated users are present in the room occupants array
        const presentUsers = [];
        const missingUsers = [];

        for (const user of usersInRoom) {
          const isPresent = room.roomOccupants.some(
            occ => occ.userId && occ.userId.toString() === user._id.toString()
          );
          if (isPresent) {
            presentUsers.push(user);
          } else {
            missingUsers.push(user);
          }
        }

        const hasMissingUsers = missingUsers.length > 0;
        
        // Build the target roomOccupants array (with missing users added)
        const targetRoomOccupants = [...room.roomOccupants];
        const isColivingRoom = room.sharingType === "Coliving";
        let targetOccupantCount = 0;
        const colivingOccupantDetails = [];

        // For logging missing users to be added
        const usersToAdd = [];
        for (const user of missingUsers) {
          const occupantType = mapUserTypeToRoomOccupantType(user.userType) || "longTermResident";
          const newOccupant = {
            userId: user._id,
            userType: occupantType
          };
          targetRoomOccupants.push(newOccupant);
          usersToAdd.push({ user, occupantType });
        }

        // Calculate occupant contributions
        for (const occ of targetRoomOccupants) {
          const occupantUser = activeUsers.find(u => u._id.toString() === occ.userId.toString());
          if (isColivingRoom && occupantUser && occupantUser.isColiving && occupantUser.colivingPartner && occupantUser.colivingPartner.name) {
            targetOccupantCount += 2;
            colivingOccupantDetails.push({
              name: occupantUser.name,
              userId: occupantUser.userId,
              partnerName: occupantUser.colivingPartner.name,
              contribution: 2
            });
          } else {
            targetOccupantCount += 1;
            colivingOccupantDetails.push({
              name: occupantUser ? occupantUser.name : `Unknown User (ID: ${occ.userId})`,
              userId: occupantUser ? occupantUser.userId : occ.userId,
              partnerName: null,
              contribution: 1
            });
          }
        }

        const currentOccupantField = room.occupant;
        const currentVacantSlotField = room.vacantSlot;
        const roomCapacity = room.roomCapacity;

        // Determine if occupancy state is wrong
        const isOccupantCountWrong = currentOccupantField !== targetOccupantCount;
        const isVacantSlotWrong = currentVacantSlotField !== (roomCapacity - targetOccupantCount);

        if (hasMissingUsers || isOccupantCountWrong || isVacantSlotWrong) {
          roomsMismatched++;
          console.log(`--------------------------------------------------------------------------------`);
          console.log(`📍 Room: ${room.propertyName} - Room No: ${room.roomNo} (ID: ${roomId})`);
          console.log(`   Sharing Type: ${room.sharingType} | Capacity: ${roomCapacity}`);
          
          if (presentUsers.length > 0) {
            console.log(`   Non-vacated users referencing this room and present in roomOccupants:`);
            presentUsers.forEach(u => console.log(`     - ${u.name} (${u.userId})`));
          }
          
          if (missingUsers.length > 0) {
            console.log(`   ❌ Active users referencing this room but MISSING from roomOccupants:`);
            missingUsers.forEach(u => console.log(`     - ${u.name} (${u.userId})`));
          }

          if (isColivingRoom) {
            console.log(`   ℹ️  Coliving Room Occupant Contributions:`);
            colivingOccupantDetails.forEach(c => {
              if (c.partnerName) {
                console.log(`     - ${c.name} (${c.userId}) [Partner: ${c.partnerName}] ➔ Counts as 2`);
              } else {
                console.log(`     - ${c.name} (${c.userId}) [No partner name] ➔ Counts as 1`);
              }
            });
          }

          console.log(`   Current DB Values: occupant count = ${currentOccupantField}, vacant slots = ${currentVacantSlotField}`);
          console.log(`   Target DB Values: occupant count = ${targetOccupantCount}, vacant slots = ${Math.max(0, roomCapacity - targetOccupantCount)}`);
          console.log(`   ❌ Occupancy state is WRONG!`);

          const targetOccupant = targetOccupantCount;
          const targetVacantSlot = Math.max(0, roomCapacity - targetOccupant);

          if (LIVE_MODE) {
            console.log(`   🛠️  [LIVE] Correcting Room ID ${roomId}:`);
            if (hasMissingUsers) {
              console.log(`      Adding missing occupants to roomOccupants array...`);
              for (const item of usersToAdd) {
                room.roomOccupants.push({
                  userId: item.user._id,
                  userType: item.occupantType
                });
              }
            }
            console.log(`      updating occupant: ${currentOccupantField} ➔ ${targetOccupant}`);
            console.log(`      updating vacantSlot: ${currentVacantSlotField} ➔ ${targetVacantSlot}`);
            
            room.occupant = targetOccupant;
            room.vacantSlot = targetVacantSlot;
            await room.save();
            console.log("   ✅ Successfully updated room count and occupants in database.");
            roomsCorrected++;
          } else {
            console.log(`   🔍 [DRY] Would correct Room ID ${roomId}:`);
            if (hasMissingUsers) {
              console.log(`      Would add missing occupants to roomOccupants array.`);
            }
            console.log(`      Would update occupant: ${currentOccupantField} ➔ ${targetOccupant}`);
            console.log(`      Would update vacantSlot: ${currentVacantSlotField} ➔ ${targetVacantSlot}`);
          }
        }
      } catch (err) {
        errors++;
        console.error(`❌ Error processing Room ID ${roomId}:`, err);
      }
    }

    console.log("\n================================================================================");
    console.log("SUMMARY OF EXECUTION");
    console.log("================================================================================");
    console.log(`Total Rooms Checked: ${roomsChecked}`);
    console.log(`Total Rooms with Mismatches: ${roomsMismatched}`);
    if (LIVE_MODE) {
      console.log(`Total Rooms Corrected in DB: ${roomsCorrected}`);
    } else {
      console.log("ℹ️  Dry Mode enabled. No database changes were written.");
    }
    console.log(`Total Errors Encountered: ${errors}`);
    console.log("================================================================================");

  } catch (error) {
    console.error("❌ Fatal Error in script execution:", error);
  } finally {
    if (userConn) {
      await userConn.close();
      console.log("User Database connection closed.");
    }
    if (propertyConn) {
      await propertyConn.close();
      console.log("Property Database connection closed.");
    }
    process.exit(0);
  }
}

runCorrection();
