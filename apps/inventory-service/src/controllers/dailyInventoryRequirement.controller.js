import { createResponder } from "../../../../libs/common/rabbitMq.js";
import { INVENTORY_PATTERN } from "../../../../libs/patterns/inventory/inventory.pattern.js";
import {
  addDailyRequirement,
  approveDailyRequirement,
  getDailyRequirements,
  rejectDailyRequirement,
  updateDailyRequirement,
} from "../services/dailyInventoryRequirement.service.js";

createResponder(INVENTORY_PATTERN.DAILY_REQUIREMENT?.GET, async (data) => {
  return await getDailyRequirements(data);
});

createResponder(INVENTORY_PATTERN.DAILY_REQUIREMENT?.ADD, async (data) => {
  return await addDailyRequirement(data);
});

createResponder(INVENTORY_PATTERN.DAILY_REQUIREMENT?.UPDATE, async (data) => {
  return await updateDailyRequirement(data);
});

createResponder(INVENTORY_PATTERN.DAILY_REQUIREMENT?.APPROVE, async (data) => {
  return await approveDailyRequirement(data);
});

createResponder(INVENTORY_PATTERN.DAILY_REQUIREMENT?.REJECT, async (data) => {
  return await rejectDailyRequirement(data);
});
