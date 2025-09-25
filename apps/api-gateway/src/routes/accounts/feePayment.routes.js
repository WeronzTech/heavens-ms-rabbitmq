import express from "express";
import { addFeePaymentController,
        getAllFeePaymentsController,
        getFeePaymentController, 
        getMonthWiseRentCollectionController, 
        updateFeePaymentController } from "../../controllers/accounts/feePayments.controller.js";



const feePaymentRoutes = express.Router();

feePaymentRoutes.post("/add-payment", addFeePaymentController);

feePaymentRoutes.put("/update/:id", updateFeePaymentController);

feePaymentRoutes.get("/:paymentId",getFeePaymentController);

feePaymentRoutes.get("/", getAllFeePaymentsController);

feePaymentRoutes.get("/monthly", getMonthWiseRentCollectionController)


export default feePaymentRoutes;
