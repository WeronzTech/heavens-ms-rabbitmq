import { createResponder } from "../../../../libs/common/rabbitMq.js";
import { USER_PATTERN } from "../../../../libs/patterns/user/user.pattern.js";
import { getActivityLogs } from "../services/userLog.service.js";

createResponder(USER_PATTERN.LOG.GET_ACTIVITY_LOGS, async (data) => {
  console.log("herere22222");
  return await getActivityLogs(data);
});
