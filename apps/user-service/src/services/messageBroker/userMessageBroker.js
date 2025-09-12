import User from "../../models/user.model.js";
import { createResponder } from "../../utils/rabbitMq.js";

createResponder("get-user", async (data) => {
  const { userId } = data;
  console.log(`[Responder] Fulfilling request for userId: ${userId}`);
  const user = await User.findById(userId);
  return user; // The return value will be sent back automatically
});
