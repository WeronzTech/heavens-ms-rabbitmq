import express from "express";
import { getAccountLogs } from "../../controllers/accounts/accountsLog.controller.js";

const logRoutes = express.Router();

logRoutes.get("/", getAccountLogs);

export default logRoutes;
