import { createResponder } from "../../../../libs/common/rabbitMq.js";
import { INVENTORY_PATTERN } from "../../../../libs/patterns/inventory/inventory.pattern.js";
import { getKitchensAccessibleToProperty } from "../services/internal.service.js";

createResponder(
  INVENTORY_PATTERN.INTERNAL.GET_ACCESSIBLE_KITCHENS,
  async (data) => {
    return await getKitchensAccessibleToProperty(data);
  }
);
