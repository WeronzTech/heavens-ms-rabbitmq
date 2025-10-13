/**
 * Mongoose Data Migration Script - PROPERTY AND ROOMS ONLY
 *
 * This script connects to the source and target databases to fetch data from
 * 'properties' and 'rooms' and inserts it into the new 'Property' and 'Room' collections.
 */

import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid"; // Needed for PropertySchema default

// =========================================================================================
// 1. CONFIGURATION
// =========================================================================================

// --- SOURCE DATABASE (Old Property and Rooms data lives here) ---
const SOURCE_MONGO_URI =
  "mongodb+srv://heavensliving:NJ5i5ZrbMayqRaKk@heavens.fg8yv.mongodb.net/yourDatabaseName?retryWrites=true&w=majority&appName=heavens"; // <-- UPDATE THIS
// --- TARGET DATABASE (New Property and Room data will be inserted here) ---
const TARGET_MONGO_URI =
  "mongodb+srv://weronztech:YOsHNIqznJgGcnRX@cluster0.degplel.mongodb.net/propertyDB?retryWrites=true&w=majority"; // <-- UPDATE THIS

const BATCH_SIZE = 100;

// =========================================================================================
// 2. SCHEMA DEFINITIONS (Property and Room)
// =========================================================================================

// --- NEW TARGET SCHEMAS ---

// New Property Schema (Minimal definition, without pre-save hook for migration)
const newPropertySchema = new mongoose.Schema({
  propertyId: { type: String, unique: true },
  propertyName: String,
  contacts: { primary: { type: String } },
  branch: String,
  phase: String,
  location: String,
  address: String,
  totalBeds: { type: Number, default: 0 },
  occupiedBeds: { type: Number, default: 0 },
  startingPrice: Number,
  sharingPrices: { type: Map, of: Number },
  deposit: { refundable: Number, nonRefundable: Number },
  propertyTitle: String,
  preferredBy: String,
  propertyType: String,
});

// New Room Schema (Minimal definition)
const newRoomSchema = new mongoose.Schema({
  propertyName: { type: String, required: true },
  roomNo: { type: String, required: true },
  sharingType: { type: String, required: true },
  roomCapacity: { type: Number, required: true },
  occupant: { type: Number, required: true },
  vacantSlot: { type: Number, required: true },
  status: { type: String, required: true },
  propertyId: { type: mongoose.Schema.Types.ObjectId, ref: "Property" },
});

// --- OLD SOURCE SCHEMAS ---

// Old Property Schema
const OldPropertySchema = new mongoose.Schema(
  {
    propertyId: { type: String, unique: true, default: uuidv4 },
    propertyName: { type: String, required: true },
    location: { type: String, required: true },
    address: { type: String, required: true },
    contactNumber: { type: String, required: true },
    totalBeds: { type: Number, required: true },
    preferredBy: { type: String, required: true },
    startingPrice: { type: Number, required: true },
    oneSharing: { type: Number },
    twoSharing: { type: Number },
    threeSharing: { type: Number },
    fourSharing: { type: Number },
    propertyType: { type: String, required: true },
    branchName: { type: String, required: true },
    phaseName: { type: String, required: true },
    propertyOwnerName: { type: String, required: true },
    rooms: [{ type: mongoose.Schema.Types.ObjectId, ref: "Rooms" }],
  },
  { collection: "properties" }
);

// Old Room Schema
const OldRoomSchema = new mongoose.Schema(
  {
    propertyName: { type: String, required: true },
    roomNumber: { type: String, required: true },
    roomType: { type: String, required: true },
    roomCapacity: { type: Number, required: true },
    occupant: { type: Number, default: 0 },
    vacantSlot: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["available", "unavailable", "underManitenance"],
      required: true,
    },
    property: { type: mongoose.Schema.Types.ObjectId, ref: "Property" },
  },
  { collection: "rooms" }
);

// =========================================================================================
// 3. MAPPING FUNCTIONS
// =========================================================================================

/**
 * Maps an Old Property document to the new Property schema.
 */
function mapOldPropertyToNewProperty(oldPropDoc) {
  const sharingPrices = {};
  if (oldPropDoc.oneSharing) sharingPrices["1"] = oldPropDoc.oneSharing;
  if (oldPropDoc.twoSharing) sharingPrices["2"] = oldPropDoc.twoSharing;
  if (oldPropDoc.threeSharing) sharingPrices["3"] = oldPropDoc.threeSharing;
  if (oldPropDoc.fourSharing) sharingPrices["4"] = oldPropDoc.fourSharing;

  const newPropData = {
    _id: oldPropDoc._id, // Preserve the ObjectId for Room references
    propertyId: oldPropDoc.propertyId, // Preserve the old UUID ID
    propertyName: oldPropDoc.propertyName,
    contacts: {
      primary: oldPropDoc.contactNumber,
      alternate: null,
    },
    branch: oldPropDoc.branchName,
    phase: oldPropDoc.phaseName,
    location: oldPropDoc.location,
    address: oldPropDoc.address,
    totalBeds: oldPropDoc.totalBeds,
    occupiedBeds: 0,
    startingPrice: oldPropDoc.startingPrice,
    sharingPrices: sharingPrices,
    deposit: {
      refundable: 0,
      nonRefundable: 0,
    },
    propertyTitle: oldPropDoc.propertyOwnerName,
    preferredBy: oldPropDoc.preferredBy,
    propertyType: oldPropDoc.propertyType,
  };
  return newPropData;
}

/**
 * Maps an Old Room document to the new Room schema.
 */
function mapOldRoomToNewRoom(oldRoomDoc) {
  const newRoomData = {
    _id: oldRoomDoc._id, // Preserve the ObjectId for User references
    propertyName: oldRoomDoc.propertyName,
    roomNo: oldRoomDoc.roomNumber,
    sharingType: oldRoomDoc.roomType,
    roomCapacity: oldRoomDoc.roomCapacity,
    occupant: oldRoomDoc.occupant,
    vacantSlot: oldRoomDoc.vacantSlot,
    status: oldRoomDoc.status,
    propertyId: oldRoomDoc.property, // Mongoose ObjectId reference is preserved
    description: null,
    roomOccupants: [],
  };
  return newRoomData;
}

// =========================================================================================
// 4. MIGRATION EXECUTION
// =========================================================================================

async function runMigration() {
  let sourceConn, targetConn;
  let counts = { property: 0, room: 0 };
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
      "Target Database connected successfully. Starting Property and Room migration..."
    );

    // 2. Define Models on specific connections
    const SourceProperty = sourceConn.model("Property", OldPropertySchema);
    const SourceRoom = sourceConn.model("Rooms", OldRoomSchema);

    const TargetProperty = targetConn.model("Property", newPropertySchema);
    const TargetRoom = targetConn.model("Room", newRoomSchema);

    // ---------------------------------------------------------------------
    // 4.1. Migrate Property data
    // ---------------------------------------------------------------------
    console.log("\n--- Starting Property Migration ---");
    const propertyCursor = SourceProperty.find().lean().cursor();
    let propSuccess = 0;
    let propError = 0;

    for (
      let doc = await propertyCursor.next();
      doc != null;
      doc = await propertyCursor.next()
    ) {
      counts.property++;
      try {
        const newPropData = mapOldPropertyToNewProperty(doc);
        // Use insertMany for bulk but we use create/save for simplicity and validation check.
        // NOTE: We manually specify _id to retain references.
        await TargetProperty.create(newPropData);
        propSuccess++;
        if (propSuccess % BATCH_SIZE === 0) {
          console.log(`Processed ${propSuccess} properties...`);
        }
      } catch (error) {
        propError++;
        console.error(
          `Error migrating Property ID: ${doc.propertyId || "Unknown ID"} (${
            doc._id
          })`,
          error.message
        );
      }
    }
    totalSuccess += propSuccess;
    totalError += propError;
    console.log(
      `Property Migration complete. Total: ${counts.property}, Success: ${propSuccess}, Errors: ${propError}`
    );

    // ---------------------------------------------------------------------
    // 4.2. Migrate Room data
    // ---------------------------------------------------------------------
    console.log("\n--- Starting Room Migration ---");
    const roomCursor = SourceRoom.find().lean().cursor();
    let roomSuccess = 0;
    let roomError = 0;

    for (
      let doc = await roomCursor.next();
      doc != null;
      doc = await roomCursor.next()
    ) {
      counts.room++;
      try {
        const newRoomData = mapOldRoomToNewRoom(doc);
        // NOTE: We manually specify _id to retain references.
        await TargetRoom.create(newRoomData);
        roomSuccess++;
        if (roomSuccess % BATCH_SIZE === 0) {
          console.log(`Processed ${roomSuccess} rooms...`);
        }
      } catch (error) {
        roomError++;
        console.error(
          `Error migrating Room ID: ${doc.roomNumber || "Unknown ID"} (${
            doc._id
          })`,
          error.message
        );
      }
    }
    totalSuccess += roomSuccess;
    totalError += roomError;
    console.log(
      `Room Migration complete. Total: ${counts.room}, Success: ${roomSuccess}, Errors: ${roomError}`
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
    console.log("PROPERTY & ROOM MIGRATION SUMMARY");
    console.log(`Properties Migrated: ${counts.property}`);
    console.log(`Rooms Migrated: ${counts.room}`);
    console.log("---------------------------------------------------------");
    console.log(`TOTAL SUCCESSFUL INSERTIONS: ${totalSuccess}`);
    console.log(`TOTAL ERRORS ENCOUNTERED: ${totalError}`);
    console.log("=========================================================");
  }
}

// Execute the main function
runMigration();
