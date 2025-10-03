import { createResponder } from "../../../../libs/common/rabbitMq.js";
import { ACCOUNTS_PATTERN } from "../../../../libs/patterns/accounts/accounts.pattern.js";
import { addVoucher } from "../service/voucher.service.js";

createResponder(
    ACCOUNTS_PATTERN.VOUCHER.ADD_VOUCHER,
    async (data) => {
      return await addVoucher(data);
    }
  );
  