import { createResponder } from "../../../../libs/common/rabbitMq.js";
import { CLIENT_PATTERN } from "../../../../libs/patterns/client/client.pattern.js";
import { addPettyCash, getPettyCash, getPettyCashByManager } from "../service/pettyCash.service.js";

createResponder(CLIENT_PATTERN.PETTYCASH.ADD_PETTYCASH, async (data) => {
    return await addPettyCash(data);
  });

  createResponder(CLIENT_PATTERN.PETTYCASH.GET_PETTYCASH, async (data) => {
    return await getPettyCash(data);
  });

  createResponder(CLIENT_PATTERN.PETTYCASH.GET_PETTYCASH_BY_MANAGER, async (data) => {
    return await getPettyCashByManager(data);
  });