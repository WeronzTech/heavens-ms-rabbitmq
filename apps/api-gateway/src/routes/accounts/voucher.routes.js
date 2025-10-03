import express from "express";
import { addVoucherController } from "../../controllers/accounts/voucher.controller.js";


const voucherRoutes = express.Router();

voucherRoutes.post("/add", addVoucherController)

export default voucherRoutes;
