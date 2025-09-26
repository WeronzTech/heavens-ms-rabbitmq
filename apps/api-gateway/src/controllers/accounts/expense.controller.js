import { sendRPCRequest } from "../../../../../libs/common/rabbitMq.js";
import { ACCOUNTS_PATTERN } from "../../../../../libs/patterns/accounts/accounts.pattern.js";

export const addExpenseController = async (req, res) => {
    try {
      const { 
              transactionId, 
              property, 
              paymentMethod, 
              amount, 
              handledBy, 
              pettyCashType, 
              ...expenseData} = req.body;
  
      const expense = await sendRPCRequest( ACCOUNTS_PATTERN.EXPENSE.ADD_EXPENSE,
       { 
        transactionId, 
        property,
        paymentMethod, 
        amount, 
        handledBy, 
        pettyCashType, 
        ...expenseData}
      );
  
      if (expense.status === 200) {
        res.status(200).json(expense);
      } else {
        res.status(expense.status).json(expense);
      }
    } catch (error) {
      console.error("Error in adding expense:", error);
      res.status(500).json({
        success: false,
        status: 500,
        message: "An internal server error occurred while adding expense.",
      });
    }
  };