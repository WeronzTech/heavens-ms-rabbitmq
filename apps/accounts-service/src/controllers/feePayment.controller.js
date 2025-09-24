import { createResponder } from "../../../../libs/common/rabbitMq.js";
import { ACCOUNTS_PATTERN } from "../../../../libs/patterns/accounts/accounts.pattern.js";
import { addFeePayment, getFeePaymentById, updateFeePayment } from "../service/feePayment.service.js";

createResponder( ACCOUNTS_PATTERN.FEE_PAYMENTS.ADD_FEE_PAYMENTS, async (data) => {
    return await addFeePayment(data);
  });
  
  createResponder( ACCOUNTS_PATTERN.FEE_PAYMENTS.UPDATE_FEE_PAYMENT, async (data) => {
    return await updateFeePayment(data);
  });

  createResponder( ACCOUNTS_PATTERN.FEE_PAYMENTS.GET_FEE_PAYMENT, async (data) => {
    return await getFeePaymentById(data);
  });
  