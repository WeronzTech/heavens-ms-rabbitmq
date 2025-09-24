import mongoose from "mongoose";
import axios from "axios";
import Kitchen from "../models/kitchen.model.js";
import Recipe from "../models/recipe.model.js";
import RecipeCategory from "../models/recipeCategory.model.js";
import { WeeklyMenu } from "../models/messMenu.model.js";
import Inventory from "../models/inventory.model.js";
import { normalizeQuantity } from "../utils/helpers.js";
import { sendRPCRequest } from "../../../../libs/common/rabbitMq.js";
import { PROPERTY_PATTERN } from "../../../../libs/patterns/property/property.pattern.js";

export const getAllKitchens = async (data) => {
  try {
    const { location, incharge, propertyId, search } = data;
    const filter = {};

    if (location) filter.location = { $regex: new RegExp(location, "i") };
    if (search) filter.name = { $regex: new RegExp(search, "i") };
    if (incharge && mongoose.Types.ObjectId.isValid(incharge))
      filter.incharge = incharge;
    if (propertyId) filter.propertyId = propertyId;

    const [kitchens, staffResponse, propertyResponse] = await Promise.all([
      Kitchen.find(filter).lean(),
      sendRPCRequest(PROPERTY_PATTERN.STAFF.GET_ALL_STAFF, {}),
      sendRPCRequest(PROPERTY_PATTERN.PROPERTY.GET_ALL_HEAVENS_PROPERTIES, {}),
    ]);

    if (kitchens.length === 0) {
      return { success: true, status: 200, data: [] };
    }

    const staffMap = new Map(
      staffResponse.data.staff.map((staff) => [
        staff._id.toString(),
        staff.name,
      ])
    );
    const propertyMap = new Map(
      propertyResponse.data.map((p) => [p._id.toString(), p.propertyName])
    );

    const enrichedKitchens = kitchens.map((kitchen) => {
      let inchargeData = null;
      if (kitchen.incharge) {
        const inchargeId = kitchen.incharge.toString();
        inchargeData = {
          _id: kitchen.incharge,
          name: staffMap.get(inchargeId) || "N/A",
        };
      }
      let propertyData;
      if (Array.isArray(kitchen.propertyId) && kitchen.propertyId.length > 0) {
        propertyData = kitchen.propertyId.map((id) => ({
          _id: id,
          name: propertyMap.get(id?.toString()) || "N/A",
        }));
      } else if (kitchen.propertyId) {
        propertyData = {
          _id: kitchen.propertyId,
          name: propertyMap.get(kitchen.propertyId?.toString()) || "N/A",
        };
      } else {
        propertyData = kitchen.propertyId;
      }
      return { ...kitchen, incharge: inchargeData, propertyId: propertyData };
    });

    return {
      success: true,
      status: 200,
      message: "Kitchens retrieved successfully",
      data: enrichedKitchens,
    };
  } catch (error) {
    console.error("Error in getAllKitchens:", error.message);
    return { success: false, status: 500, message: "Server error" };
  }
};

export const getKitchens = async () => {
  try {
    const kitchens = await Kitchen.find({}, "_id name").lean();
    return {
      success: true,
      status: 200,
      message: "Kitchens retrieved successfully.",
      data: kitchens,
    };
  } catch (error) {
    console.error("Error in getKitchens:", error.message);
    return { success: false, status: 500, message: "Server error" };
  }
};

export const getKitchenById = async ({ id }) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return { success: false, status: 400, message: "Invalid kitchen ID" };
    }
    const kitchen = await Kitchen.findById(id);
    if (!kitchen) {
      return { success: false, status: 404, message: "Kitchen not found" };
    }
    return {
      success: true,
      status: 200,
      message: "Kitchen retrieved successfully.",
      data: kitchen,
    };
  } catch (error) {
    return { success: false, status: 500, message: "Server error" };
  }
};

export const addKitchen = async (data) => {
  try {
    const { name, propertyId, location, incharge } = data;
    if (!name || !Array.isArray(propertyId) || !location || !incharge) {
      return {
        success: false,
        status: 400,
        message: "All fields are required",
      };
    }
    const kitchen = await Kitchen.create({
      name,
      propertyId,
      location,
      incharge,
    });
    return {
      success: true,
      status: 201,
      message: "Kitchen added successfully.",
      data: kitchen,
    };
  } catch (error) {
    return { success: false, status: 500, message: "Server error" };
  }
};

export const editKitchen = async (data) => {
  try {
    const { id, name, propertyId, location, incharge } = data;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return { success: false, status: 400, message: "Invalid kitchen ID" };
    }
    const updatedKitchen = await Kitchen.findByIdAndUpdate(
      id,
      { name, propertyId, location, incharge },
      { new: true, runValidators: true }
    );
    if (!updatedKitchen) {
      return { success: false, status: 404, message: "Kitchen not found" };
    }
    return {
      success: true,
      status: 200,
      message: "Kitchen updated successfully.",
      data: updatedKitchen,
    };
  } catch (error) {
    return { success: false, status: 500, message: "Server error" };
  }
};

export const deleteKitchen = async ({ id }) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return { success: false, status: 400, message: "Invalid kitchen ID" };
    }
    const deleted = await Kitchen.findByIdAndDelete(id);
    if (!deleted) {
      return { success: false, status: 404, message: "Kitchen not found" };
    }
    return {
      success: true,
      status: 200,
      message: "Kitchen deleted successfully",
    };
  } catch (error) {
    return { success: false, status: 500, message: "Server error" };
  }
};

export const addRecipe = async (data) => {
  try {
    const {
      name,
      ingredients,
      servings,
      tags,
      recipeCategoryId,
      kitchenId,
      veg,
    } = data;
    if (!name || !ingredients || !servings || !recipeCategoryId || !kitchenId) {
      return {
        success: false,
        status: 400,
        message: "Missing required fields",
      };
    }
    const recipeCategory = await RecipeCategory.findById(recipeCategoryId);
    if (!recipeCategory) {
      return {
        success: false,
        status: 404,
        message: "RecipeCategory not found.",
      };
    }
    if (recipeCategory.kitchenId.toString() !== kitchenId) {
      return {
        success: false,
        status: 400,
        message: "Recipe's kitchenId does not match the category's kitchenId.",
      };
    }
    const newRecipe = new Recipe({
      name,
      ingredients,
      servings,
      tags,
      kitchenId,
      veg,
    });
    const savedRecipe = await newRecipe.save();
    recipeCategory.recipes.push(savedRecipe._id);
    await recipeCategory.save();
    return {
      success: true,
      status: 201,
      message: "Recipe created successfully",
      data: savedRecipe,
    };
  } catch (error) {
    return { success: false, status: 500, message: "Internal server error" };
  }
};

export const editRecipe = async (data) => {
  try {
    const { id, updates } = data;
    const originalRecipe = await Recipe.findById(id);
    if (!originalRecipe) {
      return { success: false, status: 404, message: "Recipe not found." };
    }
    const updatedRecipe = await Recipe.findByIdAndUpdate(id, updates, {
      new: true,
    });
    const newCategoryId = updates.recipeCategory;
    const oldCategoryId = originalRecipe.recipeCategory;
    if (
      newCategoryId &&
      newCategoryId.toString() !== oldCategoryId.toString()
    ) {
      await RecipeCategory.findByIdAndUpdate(newCategoryId, {
        $push: { recipes: updatedRecipe._id },
      });
      await RecipeCategory.findByIdAndUpdate(oldCategoryId, {
        $pull: { recipes: updatedRecipe._id },
      });
    }
    return {
      success: true,
      status: 200,
      message: "Recipe updated successfully",
      data: updatedRecipe,
    };
  } catch (error) {
    return { success: false, status: 500, message: "Internal server error" };
  }
};

export const getAllRecipes = async (data) => {
  try {
    const { tag, name, kitchenId } = data;
    const filter = {};
    if (tag) filter.tags = tag;
    if (name) filter.name = { $regex: name, $options: "i" };
    if (kitchenId) filter.kitchenId = kitchenId;

    const recipes = await Recipe.find(filter)
      .sort({ createdAt: -1 })
      .populate("kitchenId", "name location")
      .populate({ path: "ingredients.name", select: "productName" });

    return {
      success: true,
      status: 200,
      message: "Recipes retrieved successfully.",
      data: recipes,
    };
  } catch (error) {
    return { success: false, status: 500, message: "Internal server error" };
  }
};

export const getRecipeById = async ({ id }) => {
  try {
    const recipe = await Recipe.findById(id)
      .populate("kitchenId", "name location")
      .populate("recipeCategory", "name")
      .populate({ path: "ingredients.name", select: "productName" });
    if (!recipe) {
      return { success: false, status: 404, message: "Recipe not found" };
    }
    return {
      success: true,
      status: 200,
      message: "Recipe retrieved successfully.",
      data: recipe,
    };
  } catch (error) {
    return { success: false, status: 500, message: "Internal server error" };
  }
};

export const deleteRecipe = async ({ id }) => {
  try {
    const recipeToDelete = await Recipe.findById(id);
    if (!recipeToDelete) {
      return { success: false, status: 404, message: "Recipe not found." };
    }
    if (recipeToDelete.recipeCategory) {
      await RecipeCategory.findByIdAndUpdate(recipeToDelete.recipeCategory, {
        $pull: { recipes: recipeToDelete._id },
      });
    }
    await Recipe.findByIdAndDelete(id);
    return {
      success: true,
      status: 200,
      message: "Recipe deleted successfully.",
    };
  } catch (error) {
    return { success: false, status: 500, message: "Internal server error" };
  }
};

export const getMenuStockAnalysis = async ({ kitchenId }) => {
  try {
    if (!kitchenId) {
      return {
        success: false,
        status: 400,
        message: "Kitchen ID is required.",
      };
    }
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextDayOfWeek = tomorrow.toLocaleDateString("en-US", {
      weekday: "long",
    });

    const menu = await WeeklyMenu.findOne({ kitchenId }).lean();
    if (!menu) {
      return {
        success: false,
        status: 404,
        message: "Weekly menu not found for this kitchen.",
      };
    }
    const dailyMenu = menu.menu.find((d) => d.dayOfWeek === nextDayOfWeek);
    if (!dailyMenu || !dailyMenu.meals) {
      return {
        success: false,
        status: 404,
        message: `No menu scheduled for tomorrow (${nextDayOfWeek}).`,
      };
    }
    const analysisResult = [];

    for (const meal of dailyMenu.meals) {
      const mealAnalysis = { mealType: meal.mealType, items: [] };
      for (const recipeId of meal.itemIds) {
        const recipe = await Recipe.findById(recipeId).lean();
        if (!recipe || recipe.ingredients.length === 0) continue;

        let minServingsPossible = Infinity;
        let bottleneckIngredientInfo = null;

        for (const ingredient of recipe.ingredients) {
          const inventoryItem = await Inventory.findById(
            ingredient.name
          ).lean();
          if (!inventoryItem) {
            minServingsPossible = 0;
            bottleneckIngredientInfo = {
              productName: "Unknown (Not in Inventory)",
            };
            break;
          }
          const requiredQtyPerServing =
            normalizeQuantity(ingredient.quantity, ingredient.unit).value /
            recipe.servings;
          const availableStockInBaseUnit = normalizeQuantity(
            inventoryItem.stockQuantity,
            inventoryItem.quantityType
          );

          if (requiredQtyPerServing === 0) continue;

          const servingsPossibleForThisIngredient = Math.floor(
            availableStockInBaseUnit?.value / requiredQtyPerServing
          );
          if (servingsPossibleForThisIngredient < minServingsPossible) {
            minServingsPossible = servingsPossibleForThisIngredient;
            bottleneckIngredientInfo = {
              productName: inventoryItem.productName,
              requiredPerServing: `${(requiredQtyPerServing / 1000).toFixed(
                2
              )} ${inventoryItem.quantityType}`,
              availableStock: `${availableStockInBaseUnit.value / 1000} ${
                inventoryItem.quantityType
              }`,
            };
          }
        }
        mealAnalysis.items.push({
          recipeId: recipe._id,
          recipeName: recipe.name,
          canBePreparedFor: minServingsPossible,
          bottleneckIngredient: bottleneckIngredientInfo,
        });
      }
      analysisResult.push(mealAnalysis);
    }
    return {
      success: true,
      status: 200,
      data: {
        kitchenId,
        analysisFor: nextDayOfWeek,
        menuAnalysis: analysisResult,
      },
    };
  } catch (error) {
    console.error("Error fetching menu stock analysis:", error);
    return { success: false, status: 500, message: "Internal server error" };
  }
};
