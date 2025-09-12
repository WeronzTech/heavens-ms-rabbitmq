import express from "express";
import {getClientAuthData} from "../controllers/internal.controller.js";

const internalRoutes = express.Router();

internalRoutes.get("/auth-data", getClientAuthData);

export default internalRoutes;
