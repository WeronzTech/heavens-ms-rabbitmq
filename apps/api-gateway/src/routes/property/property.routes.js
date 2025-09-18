import express from "express";
import { createProperty, deleteProperty, getAllHeavensProperties, getClientPropertiesController, getPropertyById, updateProperty } from "../../controllers/property/property.controller.js";


const propertyRoutes = express.Router();

propertyRoutes.get("/my-properties",  getClientPropertiesController);
propertyRoutes.get("/heavens-properties", getAllHeavensProperties);
propertyRoutes.get("/:id", getPropertyById);

propertyRoutes.post("/register", createProperty);

propertyRoutes.put("/edit/:id", updateProperty);
propertyRoutes.delete("/delete/:id", deleteProperty);

export default propertyRoutes;
