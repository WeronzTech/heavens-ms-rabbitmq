import { createResponder } from "../../../../libs/common/rabbitMq.js";
import { INVENTORY_PATTERN } from "../../../../libs/patterns/inventory/inventory.pattern.js";
import {
  getInventoryByIdService,
  getKitchensAccessibleToProperty,
} from "../services/internal.service.js";

createResponder(
  INVENTORY_PATTERN.INTERNAL.GET_ACCESSIBLE_KITCHENS,
  async (data) => {
    return await getKitchensAccessibleToProperty(data);
  }
);

createResponder(
  INVENTORY_PATTERN.INTERNAL.GET_INVENTORY_DATA_BY_ID,
  async (data) => {
    return await getInventoryByIdService(data);
  }
);
