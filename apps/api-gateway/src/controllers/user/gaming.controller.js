import { sendRPCRequest } from "../../../../../libs/common/rabbitMq.js";
import { USER_PATTERN } from "../../../../../libs/patterns/user/user.pattern.js"; // Updated Pattern

const handleRPCAndRespond = async (res, pattern, data) => {
  try {
    const response = await sendRPCRequest(pattern, data);
    return res.status(response.status || 500).json(response);
  } catch (error) {
    console.error(`API Gateway Error in pattern ${pattern}:`, error);
    return res
      .status(500)
      .json({ message: "Internal Server Error in API Gateway." });
  }
};

// --- Gaming Item Controllers ---

export const createGamingItem = (req, res) => {
  const payload = { ...req.body };

  // Handle file uploads, converting the image to base64
  if (req.files?.itemImage?.[0]) {
    payload.itemImage = req.files.itemImage[0];
  }

  return handleRPCAndRespond(res, USER_PATTERN.GAMING.ITEM.CREATE, payload);
};

export const getAllGamingItems = (req, res) =>
  handleRPCAndRespond(res, USER_PATTERN.GAMING.ITEM.GET_ALL, {});

export const getGamingItemById = (req, res) =>
  handleRPCAndRespond(res, USER_PATTERN.GAMING.ITEM.GET_BY_ID, {
    itemId: req.params.itemId,
  });

export const updateGamingItem = (req, res) => {
  const payload = { ...req.body, itemId: req.params.itemId };

  // Also handle file uploads on update
  if (req.files?.itemImage?.[0]) {
    payload.itemImage = req.files.itemImage[0];
  }

  return handleRPCAndRespond(res, USER_PATTERN.GAMING.ITEM.UPDATE, payload);
};

export const updateGamingItemStatus = (req, res) =>
  handleRPCAndRespond(res, USER_PATTERN.GAMING.ITEM.UPDATE_STATUS, {
    ...req.body,
    itemId: req.params.itemId,
  });

export const deleteGamingItem = (req, res) =>
  handleRPCAndRespond(res, USER_PATTERN.GAMING.ITEM.DELETE, {
    itemId: req.params.itemId,
  });

// --- Gaming Order & Payment Controllers ---

export const initiateOrder = (req, res) => {
  const payload = { ...req.body, userId: req.userAuth };
  return handleRPCAndRespond(res, USER_PATTERN.GAMING.ORDER.INITIATE, payload);
};

export const verifyAndConfirmOrder = (req, res) => {
  const payload = { ...req.body };
  return handleRPCAndRespond(
    res,
    USER_PATTERN.GAMING.ORDER.VERIFY_AND_CONFIRM,
    payload
  );
};

export const updateOrderStatus = (req, res) =>
  handleRPCAndRespond(res, USER_PATTERN.GAMING.ORDER.UPDATE_STATUS, {
    ...req.body,
    orderId: req.params.orderId,
  });

export const getAllOrders = (req, res) =>
  handleRPCAndRespond(res, USER_PATTERN.GAMING.ORDER.GET_ALL, req.query);

export const getOrderById = (req, res) =>
  handleRPCAndRespond(res, USER_PATTERN.GAMING.ORDER.GET_BY_ID, {
    orderId: req.params.orderId,
  });

export const updateUserGamePlayedStatus = (req, res) => {
  // The user's ID is retrieved from the authentication token
  const payload = { userId: req.userAuth };
  return handleRPCAndRespond(
    res,
    USER_PATTERN.GAMING.UPDATE_PLAYED_STATUS,
    payload
  );
};
