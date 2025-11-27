import QueuedInventory from "../models/queuedInventory.model.js";
import Inventory from "../models/inventory.model.js";
import InventoryLog from "../models/inventoryLog.model.js";
import { AddonBooking } from "../models/addonBooking.model.js";
import { Addon } from "../models/addons.model.js";
import { MealBooking } from "../models/mealBooking.model.js";
import { WeeklyMenu } from "../models/messMenu.model.js";
import Recipe from "../models/recipe.model.js";
import { denormalizeQuantity, normalizeQuantity } from "./helpers.js";
import { UsageForPreparation } from "../models/usageForPreparation.model.js";
import Kitchen from "../models/kitchen.model.js";
import { sendRPCRequest } from "../../../../libs/common/rabbitMq.js";
import mongoose from "mongoose";
import DailyInventoryRequirement from "../models/dailyInventoryRequirement.model.js";

export const updateInventoryFromBookings = async () => {
  console.log("Cron job started: Updating inventory for tomorrow's bookings.");

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  const dayAfterTomorrow = new Date(tomorrow);
  dayAfterTomorrow.setDate(tomorrow.getDate() + 1);

  try {
    // 1. Fetch all meal and addon bookings for tomorrow
    const mealBookings = await MealBooking.find({
      bookingDate: { $gte: tomorrow, $lt: dayAfterTomorrow },
      status: "Pending",
    }).lean();

    const addonBookings = await AddonBooking.find({
      bookingDate: { $gte: tomorrow, $lt: dayAfterTomorrow },
      status: "Pending",
    }).lean();

    // 2. Aggregate required ingredients by kitchen, normalized to base units
    const kitchenIngredientMap = new Map();

    const addIngredientToMap = (kitchenId, ingredient) => {
      // FIX: Ensure ingredient.name is populated and has an _id before processing
      if (!ingredient.name || !ingredient.name._id) {
        console.warn(
          `Skipping an ingredient in a recipe because its ID is not populated.`
        );
        return;
      }

      const kitchenIdStr = kitchenId.toString();
      if (!kitchenIngredientMap.has(kitchenIdStr)) {
        kitchenIngredientMap.set(kitchenIdStr, new Map());
      }
      const ingredientMap = kitchenIngredientMap.get(kitchenIdStr);
      const normalized = normalizeQuantity(
        ingredient.quantity,
        ingredient.unit
      );

      // FIX: Use the inventory ID as the key for aggregation. This is more reliable.
      const key = ingredient.name._id.toString();
      const currentQuantity = ingredientMap.get(key) || 0;
      ingredientMap.set(key, currentQuantity + normalized.value);
    };

    // Process Meal Bookings
    for (const booking of mealBookings) {
      const { kitchenId, mealType } = booking;
      const dayOfWeek = tomorrow.toLocaleDateString("en-US", {
        weekday: "long",
      });

      const menu = await WeeklyMenu.findOne({ kitchenId }).lean();
      if (!menu) {
        console.warn(
          `No weekly menu found for kitchenId: ${kitchenId}. Skipping meal booking ${booking._id}.`
        );
        continue;
      }

      const dailyMenu = menu.menu.find((d) => d.dayOfWeek === dayOfWeek);
      if (!dailyMenu) continue;

      const meal = dailyMenu.meals.find((m) => m.mealType === mealType);
      if (!meal || !meal.itemIds) continue;

      for (const recipeId of meal.itemIds) {
        // Populate the ingredient names when fetching the recipe. _id is included by default.
        const recipe = await Recipe.findById(recipeId)
          .populate({
            path: "ingredients.name",
            model: "Inventory",
          })
          .lean();

        if (!recipe) {
          console.warn(`Recipe with ID ${recipeId} not found. Skipping.`);
          continue;
        }

        recipe.ingredients.forEach((ingredient) =>
          addIngredientToMap(kitchenId, ingredient)
        );
      }
    }

    // Process Addon Bookings
    for (const booking of addonBookings) {
      const { kitchenId, addons } = booking;
      for (const addonItem of addons) {
        const addonInfo = await Addon.findById(addonItem.addonId).lean();
        if (!addonInfo || !addonInfo.itemId) continue;

        // Was: const recipe = await Recipe.findById(addonInfo.recipeId)
        const recipe = await Recipe.findById(addonInfo.itemId)
          .populate({
            path: "ingredients.name",
            model: "Inventory",
          })
          .lean();

        if (!recipe) {
          console.warn(
            `Recipe with ID ${addonInfo.itemId} for an addon not found. Skipping.`
          );
          continue;
        }

        recipe.ingredients.forEach((ingredient) => {
          const scaledIngredient = {
            ...ingredient,
            quantity: ingredient.quantity * addonItem.quantity,
          };
          addIngredientToMap(kitchenId, scaledIngredient);
        });
      }
    }

    // 3. Log usage and update inventory for each kitchen
    for (const [kitchenId, ingredientMap] of kitchenIngredientMap.entries()) {
      console.log(
        `Staging inventory requirements for Kitchen ID: ${kitchenId}`
      );

      const itemsArray = [];

      for (const [inventoryId, data] of ingredientMap.entries()) {
        itemsArray.push({
          inventoryId: new mongoose.Types.ObjectId(inventoryId),
          productName: data.name,
          quantityRequired: data.quantity, // Normalized quantity
          unit: data.baseUnit,
        });
      }

      if (itemsArray.length > 0) {
        // Upsert logic: If a pending requirement exists for this date, update it.
        // If not, create a new one.
        const query = {
          kitchenId: new mongoose.Types.ObjectId(kitchenId),
          date: tomorrow,
          status: "Pending", // Only update if it hasn't been approved yet
        };

        const update = {
          $set: {
            items: itemsArray,
            generatedBy: "System Cron",
          },
        };

        const result = await DailyInventoryRequirement.findOneAndUpdate(
          query,
          update,
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        console.log(
          `Requirements staged for Kitchen ${kitchenId}: ${itemsArray.length} items.`
        );
      }
    }

    console.log("Cron job finished successfully.");
  } catch (error) {
    console.error("Error running inventory update cron job:", error);
  }
};

export const checkInventoryForTomorrow = async () => {
  console.log(
    "Cron job started: Checking inventory levels for tomorrow's bookings."
  );

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  const dayAfterTomorrow = new Date(tomorrow);
  dayAfterTomorrow.setDate(tomorrow.getDate() + 1);

  try {
    // 1. Fetch all meal and addon bookings for tomorrow
    const mealBookings = await MealBooking.find({
      bookingDate: { $gte: tomorrow, $lt: dayAfterTomorrow },
      status: "Pending",
    }).lean();

    const addonBookings = await AddonBooking.find({
      bookingDate: { $gte: tomorrow, $lt: dayAfterTomorrow },
      status: "Pending",
    }).lean();

    // 2. Aggregate the total required quantity for each ingredient per kitchen
    const kitchenIngredientMap = new Map();

    const addIngredientToMap = (kitchenId, ingredient) => {
      if (!ingredient.name || !ingredient.name._id) {
        console.warn(
          `Skipping an ingredient in a recipe because its ID is not populated.`
        );
        return;
      }

      const kitchenIdStr = kitchenId.toString();
      if (!kitchenIngredientMap.has(kitchenIdStr)) {
        kitchenIngredientMap.set(kitchenIdStr, new Map());
      }
      const ingredientMap = kitchenIngredientMap.get(kitchenIdStr);
      const normalized = normalizeQuantity(
        ingredient.quantity,
        ingredient.unit
      );

      const key = ingredient.name._id.toString(); // Use inventory ID as the key
      const currentQuantity = ingredientMap.get(key) || 0;
      ingredientMap.set(key, currentQuantity + normalized.value);
    };

    // Process Meal Bookings
    for (const booking of mealBookings) {
      const { kitchenId, mealType } = booking;
      const dayOfWeek = tomorrow.toLocaleDateString("en-US", {
        weekday: "long",
      });

      const menu = await WeeklyMenu.findOne({ kitchenId }).lean();
      if (!menu) continue;

      const dailyMenu = menu.menu.find((d) => d.dayOfWeek === dayOfWeek);
      if (!dailyMenu) continue;

      const meal = dailyMenu.meals.find((m) => m.mealType === mealType);
      if (!meal || !meal.itemIds) continue;

      for (const recipeId of meal.itemIds) {
        const recipe = await Recipe.findById(recipeId)
          .populate({ path: "ingredients.name", model: "Inventory" })
          .lean();
        if (!recipe) continue;

        recipe.ingredients.forEach((ing) => addIngredientToMap(kitchenId, ing));
      }
    }

    // Process Addon Bookings
    for (const booking of addonBookings) {
      const { kitchenId, addons } = booking;
      for (const addonItem of addons) {
        const addonInfo = await Addon.findById(addonItem.addonId).lean();
        if (!addonInfo || !addonInfo.itemId) continue;

        // Was: const recipe = await Recipe.findById(addonInfo.recipeId)
        const recipe = await Recipe.findById(addonInfo.itemId)
          .populate({ path: "ingredients.name", model: "Inventory" })
          .lean();
        if (!recipe) continue;

        recipe.ingredients.forEach((ingredient) => {
          const scaledIngredient = {
            ...ingredient,
            quantity: ingredient.quantity * addonItem.quantity,
          };
          addIngredientToMap(kitchenId, scaledIngredient);
        });
      }
    }

    // 3. Check stock levels and prepare notifications for insufficient items
    for (const [kitchenId, ingredientMap] of kitchenIngredientMap.entries()) {
      console.log(`Checking stock for Kitchen ID: ${kitchenId}`);
      for (const [inventoryId, requiredQuantity] of ingredientMap.entries()) {
        const inventoryItem = await Inventory.findById(inventoryId);

        if (!inventoryItem) {
          console.error(
            `Inventory item with ID '${inventoryId}' not found but is required for kitchen ${kitchenId}.`
          );
          continue;
        }

        if (inventoryItem.stockQuantity < requiredQuantity) {
          const deficit = requiredQuantity - inventoryItem.stockQuantity;
          console.log(
            `!! INSUFFICIENT STOCK in Kitchen ${kitchenId} for ${inventoryItem.productName}. Required: ${requiredQuantity}, Available: ${inventoryItem.stockQuantity}, Deficit: ${deficit}`
          );

          //
          // --- NOTIFICATION LOGIC GOES HERE ---
          //
          // Example: You could add the item to a list and send a single email/notification
          // per kitchen with all the items that are running low.
          //
          // sendLowStockNotification({
          //   kitchenId: kitchenId,
          //   productName: inventoryItem.productName,
          //   required: requiredQuantity,
          //   available: inventoryItem.stockQuantity,
          //   deficit: deficit,
          //   unit: inventoryItem.quantityType
          // });
          //
        }
      }
    }

    console.log("Inventory check cron job finished successfully.");
  } catch (error) {
    console.error("Error running inventory check cron job:", error);
  }
};

export const checkLowStockAndNotify = async () => {
  console.log("Cron job started: Checking for low stock items.");

  try {
    // Fetch all inventory items to perform accurate, unit-aware comparison in code.
    const allItems = await Inventory.find({}).populate({
      path: "kitchenId",
      model: Kitchen,
      select: "name incharge",
    });

    if (allItems.length === 0) {
      console.log("No inventory items found. Job finished.");
      return;
    }

    console.log(`Checking ${allItems.length} inventory item(s)...`);

    for (const item of allItems) {
      // Normalize both the current stock and the low stock threshold to base units
      const normalizedStock = normalizeQuantity(
        item.stockQuantity,
        item.quantityType
      );
      const normalizedLowStock = normalizeQuantity(
        item.lowStockQuantity,
        item.quantityType
      );

      // Ensure we are comparing compatible units (e.g., grams with grams)
      if (normalizedStock.baseUnit !== normalizedLowStock.baseUnit) {
        console.warn(
          `Skipping item ${item.productName} due to incompatible units for comparison.`
        );
        continue;
      }

      // Condition to check for low stock or out of stock
      if (normalizedStock.value <= normalizedLowStock.value) {
        let title;
        let description;

        // Customize notification for items that are completely out of stock
        if (item.stockQuantity === 0) {
          title = `Out of Stock: ${item.productName}`;
          description = `The item ${item.productName} is completely out of stock. Please reorder immediately.`;
        } else {
          title = `Low Stock Alert: ${item.productName}`;
          description = `The stock for ${item.productName} is currently at ${item.stockQuantity} ${item.quantityType}, which is at or below the threshold of ${item.lowStockQuantity} ${item.quantityType}. Please reorder soon.`;
        }

        // An inventory item can be associated with multiple kitchens.
        // We need to notify the incharge of each kitchen.
        for (const kitchen of item.kitchenId) {
          const userId = kitchen.incharge; // The user ID of the person in charge

          const notificationPayload = {
            title,
            description,
            userId,
          };

          try {
            console.log(
              `Sending notification to user ${userId} for kitchen ${kitchen.name}...`
            );

            await sendRPCRequest(
              NOTIFICATION_PATTERN.NOTIFICATION.SEND_NOTIFICATION,
              notificationPayload // ✅ wrapped in data
            );

            console.log(
              `Successfully sent notification for ${item.productName} to user ${userId}.`
            );
          } catch (error) {
            console.error(
              `Failed to send notification for item ${item.productName} to user ${userId}.`,
              error.response ? error.response.data : error.message
            );
          }
        }
      }
    }

    console.log("Cron job finished: All items checked.");
  } catch (error) {
    console.error("Error running the low stock notifier cron job:", error);
  }
};

export const autoApplyQueuedInventory = async () => {
  console.log("Checking for queued inventory updates...");

  // Get all inventory items that are eligible for queued update (stock is low)
  const inventories = await Inventory.find({
    $expr: { $lte: ["$stockQuantity", "$lowStockQuantity"] },
  });

  for (const inventory of inventories) {
    // Get all pending queued items for this inventory, sorted by createdAt (FIFO)
    const queuedList = await QueuedInventory.find({
      linkedInventoryId: inventory._id,
      status: "pending",
    }).sort({ createdAt: 1 });

    if (queuedList.length === 0) continue;

    // Take the oldest queued item (FIFO)
    const oldestQueued = queuedList[0];

    // Apply the queued item
    inventory.pricePerUnit = oldestQueued.pricePerUnit;
    inventory.totalCost = oldestQueued.totalCost;
    inventory.stockQuantity = oldestQueued.stockQuantity;
    inventory.lowStockQuantity = oldestQueued.lowStockQuantity;

    await inventory.save();

    await InventoryLog.create({
      inventoryId: inventory._id,
      kitchenId: oldestQueued.kitchenId[0],
      productName: inventory.productName,
      quantityChanged: oldestQueued.stockQuantity,
      newStock: oldestQueued.stockQuantity,
      operation: "auto_apply_queued",
      performedBy: "system",
      notes: "Queued inventory applied automatically",
    });

    // ✅ Delete applied queued record
    await QueuedInventory.findByIdAndDelete(oldestQueued._id);
  }

  console.log("Queued inventory check complete.");
};

export const deleteOldMealBookings = async () => {
  console.log("Cron job started: Deleting meal bookings older than 4 days.");

  // Calculate the date 4 days ago from the current date.
  const fourDaysAgo = new Date();
  fourDaysAgo.setDate(fourDaysAgo.getDate() - 4);
  fourDaysAgo.setHours(0, 0, 0, 0); // Set to the beginning of the day for a clean cutoff.

  try {
    // Use deleteMany to remove all documents that match the criteria.
    const result = await MealBooking.deleteMany({
      bookingDate: { $lt: fourDaysAgo }, // Find bookings with a date before four days ago.
    });

    if (result.deletedCount > 0) {
      console.log(
        `Successfully deleted ${result.deletedCount} old meal bookings.`
      );
    } else {
      console.log("No old meal bookings found to delete.");
    }

    console.log(
      "Cron job for deleting old meal bookings finished successfully."
    );
  } catch (error) {
    console.error(
      "Error running the old meal bookings cleanup cron job:",
      error
    );
  }
};
