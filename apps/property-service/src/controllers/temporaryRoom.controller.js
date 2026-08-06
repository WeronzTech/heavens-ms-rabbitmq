import { PROPERTY_PATTERN } from "../../../../libs/patterns/property/property.pattern.js";
import {
  addTempRoom,
  updateTempRoom,
  deleteTempRoom,
  getAllTempRooms,
  getTempRoomById,
} from "../services/temporaryRoom.service.js";
import { createResponder } from "../../../../libs/common/rabbitMq.js";

createResponder(PROPERTY_PATTERN.TEMPORARY_ROOM.CREATE, async (data) => {
  return await addTempRoom(data);
});

createResponder(PROPERTY_PATTERN.TEMPORARY_ROOM.UPDATE, async (data) => {
  return await updateTempRoom(data);
});

createResponder(PROPERTY_PATTERN.TEMPORARY_ROOM.DELETE, async (data) => {
  return await deleteTempRoom(data);
});

createResponder(PROPERTY_PATTERN.TEMPORARY_ROOM.GET_ALL, async (data) => {
  return await getAllTempRooms(data);
});

createResponder(PROPERTY_PATTERN.TEMPORARY_ROOM.GET_BY_ID, async (data) => {
  return await getTempRoomById(data);
});
