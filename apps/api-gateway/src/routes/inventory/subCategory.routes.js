import express from "express";

import {
  addSubCategory,
  getSubCategories,
} from "../../controllers/inventory/subCategory.controller.js";

import { isAuthenticated } from "../../middleware/isAuthenticated.js";
import { hasPermission } from "../../middleware/hasPermission.js";
import { PERMISSIONS } from "../../../../../libs/common/permissions.list.js";

const router = express.Router();

router.use(isAuthenticated);

router.post(
  "/add",
  hasPermission(PERMISSIONS.RECIPE_MANAGE),
  addSubCategory
);

router.get(
  "/get",
  hasPermission(PERMISSIONS.RECIPE_VIEW),
  getSubCategories
);

export default router;