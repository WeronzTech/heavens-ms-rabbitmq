import express from "express";
import { createProperty, updateProperty } from "../../controllers/property/property.controller.js";


const propertyRoutes = express.Router();

// router.get("/my-properties", authMiddleware, getClientProperties);
// router.get("/heavens-properties", getAllHeavensProperties);
// router.get("/:id", getPropertyById);

propertyRoutes.post("/register", createProperty);

propertyRoutes.put("/edit/:id", updateProperty);
// router.delete("/delete/:id", deleteProperty);

export default propertyRoutes;
