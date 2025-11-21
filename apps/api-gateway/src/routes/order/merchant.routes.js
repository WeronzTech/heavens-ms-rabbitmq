import { Router } from "express";
import {
  addMerchantDetails,
  approveMerchant,
  blockMerchant,
  deleteMerchant,
  getAllMerchants,
  getMerchantById,
  getMerchantByShopOwner,
  getMerchantsByBusinessCategory,
  updateMerchant,
  updateShopStatus,
} from "../../controllers/order/merchant.controller.js";
import { isAuthenticated } from "../../middleware/isAuthenticated.js";
import { upload } from "../../../../../libs/common/imageOperation.js";

const merchantRoutes = Router();

// Public or semi-public
merchantRoutes.get("/", getAllMerchants);
merchantRoutes.get("/category", getMerchantsByBusinessCategory);
merchantRoutes.get("/:id", getMerchantById);
merchantRoutes.post(
  "/",
  upload.fields([
    { name: "merchantImage", maxCount: 1 },
    { name: "pancardImage", maxCount: 1 },
    { name: "GSTINImage", maxCount: 1 },
    { name: "FSSAIImage", maxCount: 1 },
    { name: "aadharImage", maxCount: 1 },
  ]),
  addMerchantDetails
);
merchantRoutes.get("/shop-owner/:shopOwnerId", getMerchantByShopOwner);

merchantRoutes.use(isAuthenticated);



merchantRoutes.put(
  "/:id",
  upload.fields([
    { name: "merchantImage", maxCount: 1 },
    { name: "pancardImage", maxCount: 1 },
    { name: "GSTINImage", maxCount: 1 },
    { name: "FSSAIImage", maxCount: 1 },
    { name: "aadharImage", maxCount: 1 },
  ]),
  updateMerchant
);


merchantRoutes.patch("/:id/approve", approveMerchant);
merchantRoutes.patch("/:id/block", blockMerchant);
merchantRoutes.patch("/:id/status", updateShopStatus);
merchantRoutes.delete("/:id", deleteMerchant);

export default merchantRoutes;
