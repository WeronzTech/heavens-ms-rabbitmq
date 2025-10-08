import express from "express";
import { addVoucherController, deleteVoucherController, getVoucherByPropertyController } from "../../controllers/accounts/voucher.controller.js";


const voucherRoutes = express.Router();

voucherRoutes.post("/add", addVoucherController)

voucherRoutes.get("/by-property", getVoucherByPropertyController)

voucherRoutes.delete("/:voucherId", deleteVoucherController)



export default voucherRoutes;
