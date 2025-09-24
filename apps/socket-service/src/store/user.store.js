import redisClient from "../config/redis.js";

const USERID_PREFIX = "userid:";
const SOCKETID_PREFIX = "socketid:";

export const addUser = async (userId, socketId) => {
  await redisClient.set(`${USERID_PREFIX}${userId}`, socketId);
  await redisClient.set(`${SOCKETID_PREFIX}${socketId}`, userId);
};

export const removeUserBySocketId = async (socketId) => {
  const userId = await redisClient.get(`${SOCKETID_PREFIX}${socketId}`);
  if (userId) {
    await redisClient.del(`${USERID_PREFIX}${userId}`);
    await redisClient.del(`${SOCKETID_PREFIX}${socketId}`);
  }
  return userId;
};

export const findSocketIdByUserId = async (userId) => {
  return await redisClient.get(`${USERID_PREFIX}${userId}`);
};

export const findUserIdBySocketId = async (socketId) => {
  return await redisClient.get(`${SOCKETID_PREFIX}${socketId}`);
};

export const getOnlineUsers = async () => {
  const keys = await redisClient.keys(`${USERID_PREFIX}*`);
  return keys.map((key) => key.replace(USERID_PREFIX, ""));
};
