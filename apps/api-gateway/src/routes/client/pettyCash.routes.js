import express from "express";
import {
  addPettyCashController,
  getPettyCashByManagerController,
  getPettyCashController,
} from "../../controllers/client/pettyCash.controller.js";

const pettyCashRoutes = express.Router();

pettyCashRoutes.post("/add", addPettyCashController);

pettyCashRoutes.get("/", getPettyCashController);

pettyCashRoutes.get("/:id", getPettyCashByManagerController);

export default pettyCashRoutes;
