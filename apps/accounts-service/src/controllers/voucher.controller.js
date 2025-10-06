import { createResponder } from "../../../../libs/common/rabbitMq.js";
import { ACCOUNTS_PATTERN } from "../../../../libs/patterns/accounts/accounts.pattern.js";
import { addVoucher, deleteVoucher, getVoucherByProperty } from "../service/voucher.service.js";

createResponder(
    ACCOUNTS_PATTERN.VOUCHER.ADD_VOUCHER,
    async (data) => {
      return await addVoucher(data);
    }
  );
  
  createResponder(
    ACCOUNTS_PATTERN.VOUCHER.DELETE_VOUCHER,
    async (data) => {
      return await deleteVoucher(data);
    }
  );

  createResponder(
    ACCOUNTS_PATTERN.VOUCHER.GET_VOUCHER_BY_PROPERTY,
    async (data) => {
      return await getVoucherByProperty(data);
    }
  );
  