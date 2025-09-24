import {
  createEventPermission,
  deleteEventPermission,
  emitToUsers,
  getAllEventPermissions,
  getEventPermissionById,
  updateEventPermission,
} from "../services/socket.service.js";
import { getIo } from "../index.js"; // Assuming getIo is exported from your main file
import { findSocketIdByUserId } from "../store/user.store.js"; // Assuming this is your user store
import { createResponder } from "../../../../libs/common/rabbitMq.js";
import { SOCKET_PATTERN } from "../../../../libs/patterns/socket/socket.pattern.js";

createResponder(SOCKET_PATTERN.EMIT, (data) => {
  const io = getIo();
  // We need to pass the io instance and user store function to the service
  return emitToUsers(data, io, findSocketIdByUserId);
});

createResponder(SOCKET_PATTERN.PERMISSION.CREATE, async (data) => {
  return await createEventPermission(data);
});

createResponder(SOCKET_PATTERN.PERMISSION.GET_ALL, async (data) => {
  return await getAllEventPermissions(data);
});

createResponder(SOCKET_PATTERN.PERMISSION.GET_BY_ID, async (data) => {
  return await getEventPermissionById(data);
});

createResponder(SOCKET_PATTERN.PERMISSION.UPDATE, async (data) => {
  return await updateEventPermission(data);
});

createResponder(SOCKET_PATTERN.PERMISSION.DELETE, async (data) => {
  return await deleteEventPermission(data);
});
