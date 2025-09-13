// export const assignRoomToUser = async ({ userId, roomId, userType }) => {
//   return assignToRoom({ userId, roomId, userType });
// };

import { sendRPCRequest } from "../../../../libs/common/rabbitMq";

// export const assignToRoom = async ({ userId, roomId, userType }) => {
//   console.log("Herere first");
//   console.log({ userId, roomId, userType });
//   console.log("Herere second");

//   try {
//     const response = await axios.post(
//       `${process.env.PROPERTY_SERVICE_URL}/property/internal/confirm-room-assignment`,
//       {
//         userId,
//         roomId,
//         userType,
//       },
//       {
//         headers: {
//           "x-internal-key": process.env.INTERNAL_SECRET_KEY,
//         },
//       }
//     );
//     return response.data;
//   } catch (error) {
//     if (error.response) {
//       const err = new Error(
//         error.response.data.error || "Failed to assign to room"
//       );
//       err.status = error.response.status;
//       throw err;
//     }
//     throw new Error("Property service unavailable");
//   }
// };

export const assignRoomToUser = async ({ userId, roomId, userType }) => {
  return sendRPCRequest(PROPERTY_PATTERN.ROOM.CONFIRM_ASSIGNMENT, {
    userId,
    roomId,
    userType,
  });
};
