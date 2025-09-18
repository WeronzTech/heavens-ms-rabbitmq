import express from "express";
import { addFeePaymentController } from "../../controllers/accounts/feePayments.controller.js";


const feePaymentRoutes = express.Router();

feePaymentRoutes.post("/add-payment", addFeePaymentController);


export default feePaymentRoutes;
