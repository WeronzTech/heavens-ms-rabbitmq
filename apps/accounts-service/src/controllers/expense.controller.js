import { createResponder } from "../../../../libs/common/rabbitMq.js";
import { ACCOUNTS_PATTERN } from "../../../../libs/patterns/accounts/accounts.pattern.js";
import { addExpense } from "../service/expense.service.js";

createResponder(ACCOUNTS_PATTERN.EXPENSE.ADD_EXPENSE, async (data) => {
    return await addExpense(data);
  });
  