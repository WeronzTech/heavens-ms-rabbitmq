import { createResponder } from "../../../../libs/common/rabbitMq.js";
import { ACCOUNTS_PATTERN } from "../../../../libs/patterns/accounts/accounts.pattern.js";
import {
  addCommission,
  getAllCommissions,
  getCommissionById,
  editCommission,
  deleteCommission,
  checkUserCommission,
  getCommissionByProperty,
} from "../service/commission.service.js";

createResponder(ACCOUNTS_PATTERN.COMMISSION.ADD_COMMISSION, async (data) => {
  return await addCommission(data);
});
createResponder(
  ACCOUNTS_PATTERN.COMMISSION.GET_ALL_COMMISSION,
  async (data) => {
    return await getAllCommissions(data);
  }
);
createResponder(
  ACCOUNTS_PATTERN.COMMISSION.GET_COMMISSION_BY_ID,
  async (data) => {
    return await getCommissionById(data);
  }
);
createResponder(ACCOUNTS_PATTERN.COMMISSION.EDIT_COMMISSION, async (data) => {
  return await editCommission(data);
});
createResponder(ACCOUNTS_PATTERN.COMMISSION.DELETE_COMMISSION, async (data) => {
  return await deleteCommission(data);
});
createResponder(
  ACCOUNTS_PATTERN.COMMISSION.GET_ALL_COMMISSION_BY_USER,
  async (data) => {
    return await checkUserCommission(data);
  }
);

createResponder(
  ACCOUNTS_PATTERN.COMMISSION.GET_COMMISSION_BY_PROPERTY,
  async (data) => {
    return await getCommissionByProperty(data);
  }
);
