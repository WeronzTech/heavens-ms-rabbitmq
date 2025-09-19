import { createResponder } from "../../../../libs/common/rabbitMq.js";
import { PROPERTY_PATTERN } from "../../../../libs/patterns/property/property.pattern.js";
import { getActivityLogs } from "../services/log.service.js";

createResponder(PROPERTY_PATTERN.PROPERTY_LOG.GET_ACTIVITY_LOG, async (data) => {
  return await getActivityLogs(data);
});