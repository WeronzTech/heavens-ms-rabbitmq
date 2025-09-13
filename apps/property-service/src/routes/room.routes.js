import express from "express";
import {
  addRoom,
  updateRoom,
  getRoomsByPropertyId,
  getAllHeavensRooms,
  getAvailableRoomsByProperty,
  deleteRoom,
  getRoomOccupants,
} from "../controllers/room.controller.js";

const router = express.Router();

router.get("/heavens-rooms", getAllHeavensRooms);
router.get("/availableRooms", getAvailableRoomsByProperty);
router.get("/occupants/:roomId", getRoomOccupants);
router.get("/:propertyId", getRoomsByPropertyId);
router.post("/add", addRoom);
router.put("/update/:id", updateRoom);
router.delete("/delete/:id", deleteRoom);

export default router;
