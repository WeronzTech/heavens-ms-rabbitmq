import mongoose from "mongoose";
import { ApiError } from "./ApiError.js";

export const validateRequired = (value, fieldName) => {
  if (
    value === null ||
    value === undefined ||
    (typeof value === "string" && !value.trim())
  ) {
    throw new ApiError(400, `${fieldName} is required.`, [
      {
        field: fieldName,
        message: `${fieldName} cannot be empty.`,
      },
    ]);
  }
};

export const validateObjectId = (id, fieldName) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, `${fieldName} must be a valid ObjectId`, [
      {
        field: fieldName,
        message: `Invalid format for ${fieldName}. Please provide a valid ObjectId.`,
      },
    ]);
  }
};

export const validateMealTypeForAddon = (
  addon,
  requestedMealType,
  path = "mealType"
) => {
  const allowedTypes = ["Breakfast", "Lunch", "Snacks", "Dinner"];
  if (!allowedTypes.includes(requestedMealType)) {
    throw new ApiError(400, "Invalid meal type provided", [
      {
        field: `${path}`,
        message: `Meal type must be one of: ${allowedTypes.join(", ")}`,
      },
    ]);
  }

  if (!addon.mealType.includes(requestedMealType)) {
    throw new ApiError(
      400,
      `${addon.itemName} is not available for ${requestedMealType}`,
      [
        {
          field: `${path}`,
          message: `Available meal types for ${
            addon.itemName
          }: ${addon.mealType.join(", ")}`,
        },
      ]
    );
  }
};

export const normalizeDate = (dateInput) => {
  const date = new Date(dateInput);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
};

export const getTomorrowDate = () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return new Date(
    tomorrow.getFullYear(),
    tomorrow.getMonth(),
    tomorrow.getDate()
  );
};

export const validateAddonData = (data, partial = false) => {
  const { itemName, itemDescription, itemImage, price, mealType } = data;
  const errors = [];

  // Validate Item Name
  if (!partial || "itemName" in data) {
    if (!itemName || typeof itemName !== "string" || !itemName.trim()) {
      errors.push({
        field: "itemName",
        message: "Item name is required and must be a non-empty string",
      });
    }
  }

  // Validate Item Description
  if (!partial || "itemDescription" in data) {
    if (
      !itemDescription ||
      typeof itemDescription !== "string" ||
      !itemDescription.trim()
    ) {
      errors.push({
        field: "itemDescription",
        message: "Item description is required and must be a non-empty string",
      });
    }
  }

  // Validate Item Image
  if (!partial || "itemImage" in data) {
    if (!itemImage || typeof itemImage !== "string" || !itemImage.trim()) {
      errors.push({
        field: "itemImage",
        message: "Item image is required and must be a non-empty string",
      });
    }
  }

  // Validate price
  if (!partial || "price" in data) {
    // The price can be 0, so we check for undefined
    if (price === undefined || typeof price !== "number" || price < 0) {
      errors.push({
        field: "price",
        message: "Price is required and must be a non-negative number",
      });
    }
  }

  // Validate Mealtype
  const allowedMeals = ["Breakfast", "Lunch", "Snacks", "Dinner"];
  if (!partial || "mealType" in data) {
    if (!Array.isArray(mealType) || mealType.length === 0) {
      errors.push({
        field: "mealType",
        message: "At least one meal type must be specified",
      });
    } else {
      mealType.forEach((type, index) => {
        if (!allowedMeals.includes(type)) {
          errors.push({
            field: `mealType[${index}]`,
            message: `${type} is not a valid meal type. Valid types are: ${allowedMeals.join(
              ", "
            )}`,
          });
        }
      });
    }
  }

  if (errors.length > 0) {
    throw new ApiError(400, "Invalid Addon data provided", errors);
  }
};

export const validateMealType = (mealType) => {
  const validTypes = ["Breakfast", "Lunch", "Snacks", "Dinner"];
  if (!validTypes.includes(mealType)) {
    throw new ApiError(400, "Invalid mealType filter provided", [
      {
        field: "mealType",
        message: `Meal type must be one of: ${validTypes.join(", ")}`,
      },
    ]);
  }
};

export const validateMealAvailability = async (propertyId, date, mealType) => {
  try {
    const dayOfWeek = new Date(date).toLocaleDateString("en-US", {
      weekday: "long",
    });

    const menu = await menuService.getTodaysMenu(propertyId, dayOfWeek);

    const matchingMeal = menu.meals.find((meal) => meal.mealType === mealType);

    if (!matchingMeal) {
      throw new ApiError(400, `${mealType} is not available on ${dayOfWeek}`);
    }

    if (!matchingMeal.items || typeof matchingMeal.items !== "object") {
      throw new ApiError(
        400,
        `items are not available for ${mealType} on ${dayOfWeek}`
      );
    }
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(500, "Meal availability check failed", [], error.stack);
  }
};

export const validateBookingTime = async (propertyId) => {
  const menu = await menuService.getWeeklyMenu(propertyId);
  const now = new Date();
  // Time in minutes from midnight
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const [startHour, startMinute] = menu.bookingStartTime.split(":").map(Number);
  const [endHour, endMinute] = menu.bookingEndTime.split(":").map(Number);

  const bookingStartMinutes = startHour * 60 + startMinute;
  const bookingEndMinutes = endHour * 60 + endMinute;

  if (
    currentMinutes < bookingStartMinutes ||
    currentMinutes > bookingEndMinutes
  ) {
    throw new ApiError(
      400,
      `Bookings are only allowed between ${menu.bookingStartTime} and ${menu.bookingEndTime}`
    );
  }
};

export const validateMealTimesArray = (mealTimes) => {
  const errors = [];
  const allowedMealTypes = ["Breakfast", "Lunch", "Snacks", "Dinner"];

  if (!Array.isArray(mealTimes) || mealTimes.length === 0) {
    errors.push({
      field: "mealTimes",
      message: "mealTimes must be a non-empty array",
    });
  } else {
    const seen = new Set();
    for (let i = 0; i < mealTimes.length; i++) {
      const { mealType, start, end } = mealTimes[i];
      const label = mealType || `at index ${i}`;

      if (!mealType) {
        errors.push({
          field: `mealTimes[${i}].mealType`,
          message: `Meal type is required for entry at index ${i}`,
        });
      } else if (!allowedMealTypes.includes(mealType)) {
        errors.push({
          field: `mealTimes[${i}].mealType`,
          message: `'${mealType}' is not a valid meal type.`,
        });
      } else if (seen.has(mealType)) {
        errors.push({
          field: `mealTimes[${i}].mealType`,
          message: `Duplicate mealType '${mealType}' is not allowed.`,
        });
      } else {
        seen.add(mealType);
      }

      if (!start || !end) {
        errors.push({
          field: `mealTimes[${i}]`,
          message: `Start and end times are required for '${label}'`,
        });
      } else if (start >= end) {
        errors.push({
          field: `mealTimes[${i}].end`,
          message: `End time must be after start time for '${label}'`,
        });
      }
    }
  }

  if (errors.length > 0) {
    throw new ApiError(400, "Invalid Meal Times", errors);
  }
};

export const validateMenuData = (menuData) => {
  const errors = [];

  // Validate booking times
  if (!menuData.bookingStartTime || !menuData.bookingEndTime) {
    errors.push({
      field: "bookingTimes",
      message: "Both start and end booking times are required",
    });
  } else if (menuData.bookingStartTime >= menuData.bookingEndTime) {
    errors.push({
      field: "bookingEndTime",
      message: "Must be after booking start time",
    });
  }

  // Validate days structure
  if (
    !menuData.menu ||
    !Array.isArray(menuData.menu) ||
    menuData.menu.length === 0
  ) {
    errors.push({
      field: "menu",
      message: "At least one day must be provided",
    });
  } else {
    const seenDays = new Set();
    menuData.menu.forEach((day, index) => {
      if (!day.dayOfWeek) {
        errors.push({
          field: `menu[${index}].dayOfWeek`,
          message: "Day of week is required",
        });
      } else if (seenDays.has(day.dayOfWeek)) {
        errors.push({
          field: `menu[${index}].dayOfWeek`,
          message: "Duplicate day detected",
        });
      } else {
        seenDays.add(day.dayOfWeek);
      }
      validateDayMeals(day, index, errors);
    });
  }

  if (errors.length > 0) {
    throw new ApiError(400, "Invalid menu data", errors);
  }
};

export const validateDayMeals = (day, dayIndex, errors) => {
  if (!day.meals || !Array.isArray(day.meals) || day.meals.length === 0) {
    errors.push({
      field: `menu[${dayIndex}].meals`,
      message: "At least one meal is required for the day",
    });
  } else {
    const seenMealTypes = new Set();
    day.meals.forEach((meal, mealIndex) => {
      const mealPrefix = `menu[${dayIndex}].meals[${mealIndex}]`;

      if (!meal.mealType) {
        errors.push({
          field: `${mealPrefix}.mealType`,
          message: "Meal type is required",
        });
      } else if (seenMealTypes.has(meal.mealType)) {
        errors.push({
          field: `${mealPrefix}.mealType`,
          message: "Duplicate meal type for the day",
        });
      } else {
        seenMealTypes.add(meal.mealType);
      }

      // if (
      //   !meal.items ||
      //   typeof meal.items !== "object" ||
      //   Object.keys(meal.items).length === 0
      // ) {
      //   errors.push({
      //     field: `${mealPrefix}.items`,
      //     message:
      //       "Items must be an object with at least one dietary type (e.g., 'Veg')",
      //   });
      // } else {
      //   for (const [type, itemList] of Object.entries(meal.items)) {
      //     if (!Array.isArray(itemList) || itemList.length === 0) {
      //       errors.push({
      //         field: `${mealPrefix}.items.${type}`,
      //         message: `Items for '${type}' must be a non-empty array`,
      //       });
      //     }
      //   }
      // }
    });
  }
};

export const normalizeQuantity = (quantity, unit) => {
  const lowerCaseUnit = unit.toLowerCase();
  switch (lowerCaseUnit) {
    case "kg":
      return { value: quantity * 1000, baseUnit: "g" };
    case "g":
      return { value: quantity, baseUnit: "g" };
    case "l":
      return { value: quantity * 1000, baseUnit: "ml" };
    case "ml":
      return { value: quantity, baseUnit: "ml" };
    default:
      // For units like 'piece', 'packet', we cannot convert automatically.
      // The system will assume a 1-to-1 deduction.
      console.warn(
        `Unit "${unit}" cannot be normalized. Assuming a 1-to-1 quantity deduction.`
      );
      return { value: quantity, baseUnit: unit };
  }
};

export const drawTable = (doc, logs) => {
  let y = 120;
  const tableTop = y;
  const rowHeight = 25;
  const tableWidth = 530;
  const startX = 40;

  const colWidths = {
    date: 70,
    product: 130,
    kitchen: 90,
    quantity: 70,
    reason: 100,
    user: 70,
  };

  const colX = {
    date: startX,
    product: startX + colWidths.date,
    kitchen: startX + colWidths.date + colWidths.product,
    quantity: startX + colWidths.date + colWidths.product + colWidths.kitchen,
    reason:
      startX +
      colWidths.date +
      colWidths.product +
      colWidths.kitchen +
      colWidths.quantity,
    user:
      startX +
      colWidths.date +
      colWidths.product +
      colWidths.kitchen +
      colWidths.quantity +
      colWidths.reason,
  };

  const printHeader = (currentY) => {
    doc
      .rect(startX, currentY, tableWidth, rowHeight)
      .fill("#4A5568")
      .fontSize(10)
      .fillColor("#FFFFFF")
      .font("Helvetica-Bold")
      .text("Date", colX.date + 5, currentY + 8)
      .text("Product", colX.product + 5, currentY + 8)
      .text("Kitchen", colX.kitchen + 5, currentY + 8)
      .text("Qty", colX.quantity + 5, currentY + 8)
      .text("Reason", colX.reason + 5, currentY + 8)
      .text("User", colX.user + 5, currentY + 8);
  };

  printHeader(y);
  y += rowHeight;

  logs.forEach((log, index) => {
    if (y + rowHeight > 750) {
      doc.addPage();
      y = 40;
      printHeader(y);
      y += rowHeight;
    }
    doc
      .rect(startX, y, tableWidth, rowHeight)
      .fill(index % 2 === 0 ? "#F7FAFC" : "#FFFFFF")
      .stroke();

    doc
      .fontSize(8)
      .fillColor("#000000")
      .font("Helvetica")
      .text(moment(log.createdAt).format("DD-MM-YYYY"), colX.date + 5, y + 8)
      .text(log.inventoryId?.productName || "N/A", colX.product + 5, y + 8, {
        width: colWidths.product - 10,
      })
      .text(log.kitchenId?.name || "N/A", colX.kitchen + 5, y + 8, {
        width: colWidths.kitchen - 10,
      })
      .text(
        `${Math.abs(log.quantityChanged)} ${
          log.inventoryId?.quantityType || ""
        }`,
        colX.quantity + 5,
        y + 8
      )
      .text(log.notes.replace(/^Dead Stock: /, ""), colX.reason + 5, y + 8, {
        width: colWidths.reason - 10,
      })
      .text(log.performedBy?.name || "N/A", colX.user + 5, y + 8);
    y += rowHeight;
  });
};

export const drawWeeklyUsageTable = (doc, reportData, reportDates) => {
  let y = 120;
  const headerHeight = 40;
  const rowHeight = 30;
  const startX = 20;
  const tableWidth = 802;
  const colWidths = { itemName: 172, dayBlock: 90 };

  const printHeader = (currentY) => {
    doc
      .rect(startX, currentY, tableWidth, headerHeight)
      .fill("#4A5568")
      .stroke();
    doc.fontSize(9).fillColor("#FFFFFF").font("Helvetica-Bold");
    doc.text("Item Name (Unit)", startX + 5, currentY + headerHeight / 2 - 5);
    doc
      .moveTo(startX + colWidths.itemName, currentY + headerHeight / 2)
      .lineTo(startX + tableWidth, currentY + headerHeight / 2)
      .strokeColor("#FFFFFF")
      .stroke();
    let x = startX + colWidths.itemName;
    reportDates.forEach((date) => {
      doc.text(date.format("dddd"), x, currentY + 7, {
        width: colWidths.dayBlock,
        align: "center",
      });
      doc.fontSize(8).text("Available", x, currentY + 25, {
        width: colWidths.dayBlock / 2,
        align: "center",
      });
      doc.text("Used", x + colWidths.dayBlock / 2, currentY + 25, {
        width: colWidths.dayBlock / 2,
        align: "center",
      });
      x += colWidths.dayBlock;
    });
  };

  const printRow = (item, currentY, isEven) => {
    doc
      .rect(startX, currentY, tableWidth, rowHeight)
      .fill(isEven ? "#F7FAFC" : "#FFFFFF")
      .strokeColor("#AAAAAA")
      .stroke();
    doc.fontSize(8).fillColor("#000000").font("Helvetica");
    doc.text(
      `${item.productName} (${item.quantityType})`,
      startX + 5,
      currentY + 11,
      { width: colWidths.itemName - 10 }
    );
    let x = startX + colWidths.itemName;
    reportDates.forEach((date) => {
      const dayKey = date.format("YYYY-MM-DD");
      const dayData = item.days[dayKey] || { available: "-", used: "-" };
      doc.text(dayData.available.toString(), x, currentY + 11, {
        width: colWidths.dayBlock / 2,
        align: "center",
      });
      doc.text(
        dayData.used.toString(),
        x + colWidths.dayBlock / 2,
        currentY + 11,
        { width: colWidths.dayBlock / 2, align: "center" }
      );
      x += colWidths.dayBlock;
    });
  };

  const printVerticalLines = (startY, endY) => {
    doc.strokeColor("#AAAAAA");
    let x = startX + colWidths.itemName;
    for (let i = 0; i < reportDates.length; i++) {
      doc.moveTo(x, startY).lineTo(x, endY).stroke();
      doc
        .moveTo(x + colWidths.dayBlock / 2, startY + headerHeight / 2)
        .lineTo(x + colWidths.dayBlock / 2, endY)
        .stroke();
      x += colWidths.dayBlock;
    }
    doc
      .moveTo(startX + colWidths.itemName, startY)
      .lineTo(startX + colWidths.itemName, endY)
      .stroke();
  };

  let headerY = y;
  printHeader(headerY);
  y += headerHeight;

  reportData.forEach((item, index) => {
    if (y + rowHeight > 550) {
      printVerticalLines(headerY, y);
      doc.addPage();
      y = 40;
      headerY = y;
      printHeader(headerY);
      y += headerHeight;
    }
    printRow(item, y, index % 2 === 0);
    y += rowHeight;
  });
  printVerticalLines(headerY, y);
};
