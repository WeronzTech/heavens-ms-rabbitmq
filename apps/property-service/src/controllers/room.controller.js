import { PROPERTY_PATTERN } from "../../../../libs/patterns/property/property.pattern.js";
import {
  addRoom,
  deleteRoom,
  getAllHeavensRooms,
  getAvailableRoomsByProperty,
  getRoomOccupants,
  getRoomsByPropertyId,
  updateRoom,
} from "../services/room.service.js";
import { createResponder } from "../../../../libs/common/rabbitMq.js";

createResponder(PROPERTY_PATTERN.ROOM.CREATE_ROOM, async (data) => {
  return await addRoom(data);
});

createResponder(PROPERTY_PATTERN.ROOM.CONFIRM_ASSIGNMENT, async (data) => {
  return await confirmRoomAssignment(data);
});

createResponder(PROPERTY_PATTERN.ROOM.UPDATE_ROOM, async (data) => {
  return await updateRoom(data);
});

createResponder(PROPERTY_PATTERN.ROOM.DELETE_ROOM, async (data) => {
  return await deleteRoom(data);
});

createResponder(PROPERTY_PATTERN.ROOM.GET_ROOMS_BY_PROPERTYID, async (data) => {
  return await getRoomsByPropertyId(data);
});

createResponder(PROPERTY_PATTERN.ROOM.GET_ROOM_OCCUPANTS, async (data) => {
  return await getRoomOccupants(data);
});

createResponder(
  PROPERTY_PATTERN.ROOM.GET_AVAILABLE_ROOMS_BY_PROPERTY,
  async (data) => {
    return await getAvailableRoomsByProperty(data);
  }
);

createResponder(PROPERTY_PATTERN.ROOM.GET_ALL_HEAVENS_ROOMS, async (data) => {
  return await getAllHeavensRooms(data);
});
