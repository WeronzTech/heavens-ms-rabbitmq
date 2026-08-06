import express from "express";
import {
  addTemporaryRoom,
  updateTemporaryRoom,
  deleteTemporaryRoom,
  getAllTemporaryRooms,
  getTemporaryRoomById,
} from "../../controllers/property/temporaryRoom.controller.js";
import { isAuthenticated } from "../../middleware/isAuthenticated.js";
import { hasPermission } from "../../middleware/hasPermission.js";
import { PERMISSIONS } from "../../../../../libs/common/permissions.list.js";

const temporaryRoomRoutes = express.Router();

// Apply auth middleware to all temporary room routes
temporaryRoomRoutes.use(isAuthenticated);

temporaryRoomRoutes.get(
  "/all",
  hasPermission(PERMISSIONS.ROOM_VIEW),
  getAllTemporaryRooms
);

temporaryRoomRoutes.get(
  "/:id",
  hasPermission(PERMISSIONS.ROOM_VIEW),
  getTemporaryRoomById
);

temporaryRoomRoutes.post(
  "/add",
  hasPermission(PERMISSIONS.ROOM_MANAGE),
  addTemporaryRoom
);

temporaryRoomRoutes.put(
  "/update/:id",
  hasPermission(PERMISSIONS.ROOM_MANAGE),
  updateTemporaryRoom
);

temporaryRoomRoutes.delete(
  "/delete/:id",
  hasPermission(PERMISSIONS.ROOM_MANAGE),
  deleteTemporaryRoom
);

export default temporaryRoomRoutes;
