import express from "express";

import {
  addRoom,
  deleteRoom,
  getAllHeavensRooms,
  getAvailableRoomsByProperty,
  getRoomOccupants,
  getRoomsByPropertyId,
  updateRoom,
} from "../../controllers/property/room.controller.js";
import { isAuthenticated } from "../../middleware/isAuthenticated.js";
import { hasPermission } from "../../middleware/hasPermission.js";
import { PERMISSIONS } from "../../../../../libs/common/permissions.list.js";

const roomRoutes = express.Router();

roomRoutes.use(isAuthenticated);

roomRoutes.get(
  "/heavens-rooms",
  hasPermission(PERMISSIONS.ROOM_VIEW),
  getAllHeavensRooms
);
roomRoutes.get(
  "/availableRooms",
  hasPermission(PERMISSIONS.ROOM_VIEW),
  getAvailableRoomsByProperty
);
roomRoutes.get(
  "/occupants/:roomId",
  hasPermission(PERMISSIONS.ROOM_VIEW),
  getRoomOccupants
);
roomRoutes.get(
  "/:propertyId",
  hasPermission(PERMISSIONS.ROOM_VIEW),
  getRoomsByPropertyId
);
roomRoutes.post("/add", hasPermission(PERMISSIONS.ROOM_MANAGE), addRoom);
roomRoutes.put(
  "/update/:id",
  hasPermission(PERMISSIONS.ROOM_MANAGE),
  updateRoom
);
roomRoutes.delete(
  "/delete/:id",
  hasPermission(PERMISSIONS.ROOM_MANAGE),
  deleteRoom
);

export default roomRoutes;
