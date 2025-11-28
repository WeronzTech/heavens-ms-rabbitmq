import { REDISEARCH_LANGUAGE } from "redis";
import { sendRPCRequest } from "../../../../../libs/common/rabbitMq.js";
import { INVENTORY_PATTERN } from "../../../../../libs/patterns/inventory/inventory.pattern.js";

const handleRPCAndRespond = async (res, pattern, data) => {
  try {
    const response = await sendRPCRequest(pattern, data);
    return res.status(response.status || 500).json(response);
  } catch (error) {
    console.error(`API Gateway Error in ${pattern}:`, error);
    return res
      .status(500)
      .json({ message: "Internal Server Error in API Gateway." });
  }
};

export const getDailyRequirements = async (req, res) => {
  try {
    console.log("Response Body:");
    const data = await handleRPCAndRespond(
      res,
      INVENTORY_PATTERN.DAILY_REQUIREMENT.GET,
      req.query
    );

    return data;
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
};

export const getInventoryItems = async (req, res) => {
  try {
    console.log("Response Body:");
    const data = await handleRPCAndRespond(
      res,
      INVENTORY_PATTERN.DAILY_REQUIREMENT.GET_INVENTORY_ITEMS,
      req.query
    );

    return data;
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
};

// export const addDailyRequirement = (req, res) => {
//   return handleRPCAndRespond(res, INVENTORY_PATTERN.DAILY_REQUIREMENT.ADD, {
//     ...req.body,
//     userAuth: req.userName || req.userAuth, // Pass user info for 'generatedBy'
//   });
// };

export const addItemToRequirement = (req, res) => {
  return handleRPCAndRespond(res, INVENTORY_PATTERN.DAILY_REQUIREMENT.ADD, {
    requirementId: req.params.requirementId,
    ...req.body,
    userAuth: req.userName || req.userAuth, // Pass user info for 'generatedBy'
  });
};

// export const updateDailyRequirement = (req, res) => {
//   return handleRPCAndRespond(res, INVENTORY_PATTERN.DAILY_REQUIREMENT.UPDATE, {
//     requirementId: req.params.id,
//     items: req.body.items,
//     userAuth: req.userName || req.userAuth,
//   });
// };

export const updateDailyRequirements = (req, res) => {
  return handleRPCAndRespond(res, INVENTORY_PATTERN.DAILY_REQUIREMENT.UPDATE, {
    requirementId: req.params.requirementId,
    items: req.body.items,
    userAuth: req.userName || req.userAuth,
  });
};

export const removeItemFromRequirement = (req, res) => {
  return handleRPCAndRespond(res, INVENTORY_PATTERN.DAILY_REQUIREMENT.REMOVE, {
    requirementId: req.params.requirementId,
    inventoryId: req.body.inventoryId,
    userAuth: req.userName || req.userAuth,
  });
};

export const approveDailyRequirement = (req, res) => {
  return handleRPCAndRespond(res, INVENTORY_PATTERN.DAILY_REQUIREMENT.APPROVE, {
    requirementId: req.params.id,
    userAuth: req.userAuth, // User ID for logging who performed the action
  });
};

export const rejectDailyRequirement = (req, res) => {
  return handleRPCAndRespond(res, INVENTORY_PATTERN.DAILY_REQUIREMENT.REJECT, {
    requirementId: req.params.id,
    userAuth: req.userAuth,
  });
};
