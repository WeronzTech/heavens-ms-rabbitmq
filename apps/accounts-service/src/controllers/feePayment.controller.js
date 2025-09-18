import { createResponder } from "../../../../libs/common/rabbitMq.js";
import { ACCOUNTS_PATTERN } from "../../../../libs/patterns/accounts/accounts.pattern.js";
import { addFeePayment } from "../service/feePayment.service.js";

createResponder( ACCOUNTS_PATTERN.FEE_PAYMENTS.ADD_FEE_PAYMENTS, async (data) => {
    return await addFeePayment(data);
  });
  