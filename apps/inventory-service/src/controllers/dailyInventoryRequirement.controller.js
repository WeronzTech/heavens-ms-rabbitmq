import { createResponder } from "../../../../libs/common/rabbitMq.js";
import { INVENTORY_PATTERN } from "../../../../libs/patterns/inventory/inventory.pattern.js";
import {
  // addDailyRequirement,
  addItemToRequirement,
  approveDailyRequirement,
  getDailyRequirements,
  getInventoryItems,
  rejectDailyRequirement,
  removeItemFromRequirement,
  // updateDailyRequirement,
  updateDailyRequirements,
} from "../services/dailyInventoryRequirement.service.js";

createResponder(INVENTORY_PATTERN.DAILY_REQUIREMENT?.GET, async (data) => {
  return await getDailyRequirements(data);
});

createResponder(
  INVENTORY_PATTERN.DAILY_REQUIREMENT?.GET_INVENTORY_ITEMS,
  async (data) => {
    return await getInventoryItems(data);
  }
);

createResponder(INVENTORY_PATTERN.DAILY_REQUIREMENT?.ADD, async (data) => {
  return await addItemToRequirement(data);
});

createResponder(INVENTORY_PATTERN.DAILY_REQUIREMENT?.UPDATE, async (data) => {
  return await updateDailyRequirements(data);
});

createResponder(INVENTORY_PATTERN.DAILY_REQUIREMENT?.REMOVE, async (data) => {
  return await removeItemFromRequirement(data);
});

// createResponder(INVENTORY_PATTERN.DAILY_REQUIREMENT?.ADD, async (data) => {
//   return await addDailyRequirement(data);
// });

// createResponder(INVENTORY_PATTERN.DAILY_REQUIREMENT?.UPDATE, async (data) => {
//   return await updateDailyRequirement(data);
// });

createResponder(INVENTORY_PATTERN.DAILY_REQUIREMENT?.APPROVE, async (data) => {
  return await approveDailyRequirement(data);
});

createResponder(INVENTORY_PATTERN.DAILY_REQUIREMENT?.REJECT, async (data) => {
  return await rejectDailyRequirement(data);
});
