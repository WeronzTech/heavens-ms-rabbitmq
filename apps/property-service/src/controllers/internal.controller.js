import { createResponder } from "../../../../libs/common/rabbitMq.js";
import { PROPERTY_PATTERN } from "../../../../libs/patterns/property/property.pattern.js";
import { updatePropertyCounts } from "../services/internal.service.js";

createResponder(
  PROPERTY_PATTERN.INTERNAL.UPDATE_PROPERTY_COUNTS,
  async (data) => {
    return await updatePropertyCounts(data);
  }
);
