import { createResponder } from "../../../../libs/common/rabbitMq.js";
import { USER_PATTERN } from "../../../../libs/patterns/user/user.pattern.js";
import {
  createRoomChangeRequest,
  getPendingRoomChangeRequests,
  respondToRoomChangeRequest,
  getUserRoomChangeRequests,
} from "../services/roomChangeRequest.service.js";

createResponder(USER_PATTERN.USER.CREATE_ROOM_CHANGE_REQUEST, async (data) => {
  return await createRoomChangeRequest(data);
});

createResponder(USER_PATTERN.USER.GET_PENDING_ROOM_CHANGE_REQUESTS, async (data) => {
  return await getPendingRoomChangeRequests(data);
});

createResponder(USER_PATTERN.USER.RESPOND_TO_ROOM_CHANGE_REQUEST, async (data) => {
  return await respondToRoomChangeRequest(data);
});

createResponder(USER_PATTERN.USER.GET_USER_ROOM_CHANGE_REQUESTS, async (data) => {
  return await getUserRoomChangeRequests(data);
});
