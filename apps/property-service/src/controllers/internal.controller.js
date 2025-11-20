import { createResponder } from "../../../../libs/common/rabbitMq.js";
import { PROPERTY_PATTERN } from "../../../../libs/patterns/property/property.pattern.js";
import {
  getAssetByIdService,
  updatePropertyCounts,
} from "../services/internal.service.js";

createResponder(
  PROPERTY_PATTERN.INTERNAL.UPDATE_PROPERTY_COUNTS,
  async (data) => {
    return await updatePropertyCounts(data);
  }
);

createResponder(
  PROPERTY_PATTERN.INTERNAL.GET_ASSET_DATA_BY_ID,
  async (data) => {
    return await getAssetByIdService(data);
  }
);
