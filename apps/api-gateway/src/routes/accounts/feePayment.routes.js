import express from "express";
import { addFeePaymentController,
        getFeePaymentController, 
        updateFeePaymentController } from "../../controllers/accounts/feePayments.controller.js";



const feePaymentRoutes = express.Router();

feePaymentRoutes.post("/add-payment", addFeePaymentController);

feePaymentRoutes.put("/update/:id", updateFeePaymentController);

feePaymentRoutes.get("/:id",getFeePaymentController)


export default feePaymentRoutes;
