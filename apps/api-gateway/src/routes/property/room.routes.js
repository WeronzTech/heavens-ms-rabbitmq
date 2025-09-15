import express from "express";

import { addRoom, deleteRoom, getAllHeavensRooms, getAvailableRoomsByProperty, getRoomOccupants, getRoomsByPropertyId, updateRoom } from "../../controllers/property/room.controller.js";

const roomRoutes = express.Router();

 roomRoutes.get("/heavens-rooms", getAllHeavensRooms);
 roomRoutes.get("/availableRooms", getAvailableRoomsByProperty);
 roomRoutes.get("/occupants/:roomId", getRoomOccupants);
 roomRoutes.get("/:propertyId", getRoomsByPropertyId);
 roomRoutes.post("/add", addRoom);
 roomRoutes.put("/update/:id", updateRoom);
 roomRoutes.delete("/delete/:id", deleteRoom);

export default roomRoutes;
