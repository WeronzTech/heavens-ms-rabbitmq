import mongoose from "mongoose";
import { uploadToFirebase } from "../../../../libs/common/imageOperation.js";
import { sendRPCRequest } from "../../../../libs/common/rabbitMq.js";
import { CLIENT_PATTERN } from "../../../../libs/patterns/client/client.pattern.js";
import Expense from "../models/expense.model.js";
import ExpenseCategory from "../models/expenseCategory.model.js";
import { createAccountLog } from "./accountsLog.service.js";

export const addExpense = async (data) => {
  try {
    let {
      transactionId,
      property,
      paymentMethod,
      amount,
      handledBy,
      pettyCashType,
      billImage,
      ...expenseData
    } = data;
    console.log("data", data);

    property = JSON.parse(property);

    amount = Number(amount);
    console.log("data", property);

    // ✅ Required field validation
    if (
      !property?.id ||
      !property?.name ||
      !paymentMethod ||
      !amount ||
      !expenseData.title ||
      !expenseData.type ||
      !expenseData.category ||
      !expenseData.date
    ) {
      return {
        success: false,
        status: 400,
        message: "Missing required fieldsss",
      };
    }

    if (transactionId) {
      const existingExpense = await Expense.findOne({ transactionId });
      if (existingExpense) {
        return {
          success: false,
          status: 400,
          message: `Transaction ID "${transactionId}" already exists`,
        };
      }
    }

    // ✅ Additional validation for petty cash type
    if (paymentMethod === "Petty Cash" && !pettyCashType) {
      return {
        success: false,
        status: 400,
        message: "Petty cash type (inHand/inAccount) is required",
      };
    }

    // ✅ Handle Petty Cash validation & deduction
    if (paymentMethod === "Petty Cash") {
      const pettyCashResponse = await sendRPCRequest(
        CLIENT_PATTERN.PETTYCASH.GET_PETTYCASH_BY_MANAGER,
        { managerId: handledBy }
      );
      console.log(pettyCashResponse);
      if (!pettyCashResponse?.success || !pettyCashResponse.data) {
        return {
          success: false,
          status: 400,
          message: "No petty cash found for this manager",
        };
      }

      const pettyCash = pettyCashResponse.data;

      if (pettyCashType === "inHand" && pettyCash.inHandAmount < amount) {
        return {
          success: false,
          status: 400,
          message:
            "In-hand petty cash balance too low to process this transaction",
        };
      }

      if (pettyCashType === "inAccount" && pettyCash.inAccountAmount < amount) {
        return {
          success: false,
          status: 400,
          message:
            "In-account petty cash balance too low to process this transaction",
        };
      }

      // ✅ Deduct petty cash (send negative amount)
    }

    // let billImageURL;
    // if (billImage) {
    //   const originalQuality = true;
    //   billImageURL = await uploadToFirebase(
    //     billImage,
    //     "expense-images",
    //     originalQuality
    //   );
    // }

    // ✅ Create expense in DB
    const expense = new Expense({
      transactionId,
      property,
      handledBy,
      paymentMethod,
      // imageUrl: billImageURL,
      pettyCashType: paymentMethod === "Petty Cash" ? pettyCashType : undefined,
      amount,
      ...expenseData,
    });

    await expense.save();

    await createAccountLog({
      logType: "Expense",
      action: "Create",
      description: `Expense '${expense.title}' for ₹${expense.amount} created.`,
      amount: -expense.amount, // Negative as it's an outflow
      propertyId: expense.property.id,
      performedBy: data.handledBy || "System",
      referenceId: expense._id,
    });

    if (billImage) {
      uploadToFirebase(billImage, "expense-images", false)
        .then(async (url) => {
          await Expense.findByIdAndUpdate(expense._id, { imageUrl: url });
        })
        .catch((err) => {
          console.error("Image upload failed:", err);
        });
    }

    if (pettyCashType === "inHand") {
      await sendRPCRequest(CLIENT_PATTERN.PETTYCASH.ADD_PETTYCASH, {
        manager: handledBy,
        pettyCashType,
        inHandAmount: -amount, // 👈 deduct instead of add
      });
    }

    if (pettyCashType === "inAccount") {
      await sendRPCRequest(CLIENT_PATTERN.PETTYCASH.ADD_PETTYCASH, {
        manager: handledBy,
        pettyCashType,
        inAccountAmount: -amount, // 👈 deduct instead of add
      });
    }

    return {
      success: true,
      status: 201,
      message: "Expense added successfully",
      data: expense,
    };
  } catch (error) {
    console.error("[ACCOUNTS] Error in addExpense:", error);
    return {
      success: false,
      status: 500,
      message: "An internal server error occurred while adding expense.",
      error: error.message,
    };
  }
};

export const getAllExpenses = async (data) => {
  try {
    const {
      propertyId,
      type,
      category,
      paymentMethod,
      month,
      year,
      search,
      page,
      limit,
    } = data;
    console.log("Filters:", data);

    const query = {};

    // filter by property
    if (propertyId) {
      query["property.id"] = new mongoose.Types.ObjectId(propertyId);
    }

    // filter by type
    if (type) {
      query.type = type;
    }

    // filter by category
    if (category) {
      query.category = category;
    }

    // filter by paymentMethod
    if (paymentMethod) {
      query.paymentMethod = paymentMethod;
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { transactionId: { $regex: search, $options: "i" } },
      ];
    }

    // filter by month/year
    if (month && year) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59, 999);

      query.date = {
        $gte: startDate,
        $lte: endDate,
      };
    } else if (year) {
      const startDate = new Date(year, 0, 1);
      const endDate = new Date(year, 11, 31, 23, 59, 59, 999);

      query.date = {
        $gte: startDate,
        $lte: endDate,
      };
    }

    // pagination
    const skip = (page - 1) * limit;

    // fetch data
    const expenses = await Expense.find(query)
      .sort({ date: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // count total for frontend
    const total = await Expense.countDocuments(query);

    const totalAmountResult = await Expense.aggregate([
      { $match: query },
      { $group: { _id: null, totalAmount: { $sum: "$amount" } } },
    ]);

    const totalAmount = totalAmountResult[0]?.totalAmount || 0;

    const yearQuery = {};
    if (propertyId) {
      yearQuery["property.id"] = new mongoose.Types.ObjectId(propertyId);
    }

    const availableYears = await Expense.aggregate([
      { $match: yearQuery },
      {
        $group: {
          _id: { $year: "$date" },
        },
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          year: "$_id",
          _id: 0,
        },
      },
    ]);

    return {
      success: true,
      status: 200,
      data: expenses,
      totalAmount,
      availableYears: availableYears.map((y) => y.year),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    console.error("[ACCOUNTS] Error in getAllExpenses:", error);
    return {
      success: false,
      status: 500,
      message: "Internal server error",
      error: error.message,
    };
  }
};

// Get Expense by ID
export const getExpenseById = async (data) => {
  try {
    const { expenseId } = data;

    if (!expenseId) {
      return { success: false, status: 400, message: "Expense ID is required" };
    }

    const expense = await Expense.findById(expenseId);
    if (!expense) {
      return { success: false, status: 404, message: "Expense not found" };
    }

    return { success: true, status: 200, data: expense };
  } catch (error) {
    console.error("[ACCOUNTS] Error in getExpenseById:", error);
    return {
      success: false,
      status: 500,
      message: "Internal server error",
      error: error.message,
    };
  }
};

// Delete Expense
export const deleteExpense = async (data) => {
  try {
    const { expenseId } = data;

    if (!expenseId) {
      return { success: false, status: 400, message: "Expense ID is required" };
    }

    const expense = await Expense.findByIdAndDelete(expenseId);
    if (!expense) {
      return { success: false, status: 404, message: "Expense not found" };
    }

    await createAccountLog({
      logType: "Expense",
      action: "Delete",
      description: `Expense '${expense.title}' for ₹${expense.amount} deleted.`,
      amount: 0, // No financial change, just a record deletion
      propertyId: expense.property.id,
      performedBy: data.deletedBy || "System",
      referenceId: expense._id,
    });

    return {
      success: true,
      status: 200,
      message: "Expense deleted successfully",
      data: expense,
    };
  } catch (error) {
    console.error("[ACCOUNTS] Error in deleteExpense:", error);
    return {
      success: false,
      status: 500,
      message: "Internal server error",
      error: error.message,
    };
  }
};

export const addExpenseCategory = async (data) => {
  try {
    const { mainCategory, subCategory } = data;

    const existing = await ExpenseCategory.findOne({
      mainCategory,
      subCategory: { $regex: new RegExp(`^${subCategory}$`, "i") },
    });

    if (existing) {
      return {
        success: false,
        status: 400,
        message: `Subcategory "${subCategory}" already exists under "${mainCategory}".`,
      };
    }
    const expenseCategory = await ExpenseCategory.create({
      mainCategory,
      subCategory,
    });

    return {
      success: true,
      status: 200,
      message: "Expense category added successfully.",
      data: expenseCategory,
    };
  } catch (error) {
    console.error("Error in addExpenseCategory service:", error);
    return {
      success: false,
      status: 500,
      message:
        "An internal server error occurred while adding expenseCategory.",
      error: error.message,
    };
  }
};

export const getCategoryByMainCategory = async (data) => {
  try {
    const { mainCategory } = data;

    if (!mainCategory) {
      return {
        success: false,
        status: 400,
        message: "Main category is required",
      };
    }

    // ✅ Query DB instead of recursive call
    const categories = await ExpenseCategory.find({ mainCategory });

    return {
      success: true,
      status: 200,
      data: categories,
    };
  } catch (error) {
    console.error("[ACCOUNTS] Error in getCategoryByMainCategory:", error);
    return {
      success: false,
      status: 500,
      message:
        "An internal server error occurred while fetching categories by main category.",
    };
  }
};

export const getAllCategories = async () => {
  try {
    const categories = await ExpenseCategory.find().lean(); // fetch all categories from DB

    return {
      success: true,
      status: 200,
      data: categories,
    };
  } catch (error) {
    console.error("[ACCOUNTS] Error in getAllCategories:", error);
    return {
      success: false,
      status: 500,
      message:
        "An internal server error occurred while fetching all categories.",
    };
  }
};

export const deleteCategory = async (data) => {
  try {
    const { categoryId } = data;

    await ExpenseCategory.findByIdAndDelete(categoryId);

    return {
      success: true,
      status: 200,
      message: "Category deleted successfully.",
    };
  } catch (error) {
    console.error("Error in deleteCategory service:", error);
    return {
      success: false,
      status: 500,
      message: "An internal server error occurred while deleting category.",
      error: error.message,
    };
  }
};

export const getExpenseAnalytics = async (data) => {
  try {
    const { propertyId, year } = data;

    const targetYear = year || new Date().getFullYear();

    const match = {
      date: {
        $gte: new Date(targetYear, 0, 1),
        $lte: new Date(targetYear, 11, 31, 23, 59, 59, 999),
      },
    };

    if (propertyId) {
      match["property.id"] = new mongoose.Types.ObjectId(propertyId);
    }

    const analytics = await Expense.aggregate([
      { $match: match },
      {
        $group: {
          _id: { month: { $month: "$date" }, type: "$type" },
          totalAmount: { $sum: "$amount" },
        },
      },
      {
        $group: {
          _id: "$_id.month",
          totalExpense: { $sum: "$totalAmount" },
          types: { $push: { type: "$_id.type", totalAmount: "$totalAmount" } },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const formatted = analytics.map((monthData) => {
      const typesObj = monthData.types.reduce(
        (acc, t) => {
          acc[t.type] = t.totalAmount;
          return acc;
        },
        { pg: 0, mess: 0, others: 0 }
      );

      const monthName = new Date(0, monthData._id - 1).toLocaleString("en", {
        month: "long",
      });

      return {
        monthYear: `${monthName} ${targetYear}`,
        totalExpense: monthData.totalExpense,
        pg: typesObj.pg || 0,
        mess: typesObj.mess || 0,
        others: typesObj.others || 0,
      };
    });

    return {
      success: true,
      year: targetYear,
      data: formatted,
    };
  } catch (error) {
    console.error("[ANALYTICS] Error:", error);
    return {
      success: false,
      message: "Failed to fetch expense analytics",
      error: error.message,
    };
  }
};

export const getPettyCashPaymentsByManager = async ({ managerId }) => {
  try {
    console.log("managerId received in service:", managerId);

    const pettyCashPayments = await Expense.find({
      handledBy: new mongoose.Types.ObjectId(managerId), // cast properly
      paymentMethod: "Petty Cash",
    }).sort({ createdAt: -1 });

    console.log("Fetched pettyCashPayments:", pettyCashPayments);

    return {
      success: true,
      status: 200,
      message: "Petty cash payments fetched successfully",
      data: pettyCashPayments,
    };
  } catch (error) {
    console.error("Get Petty Cash Payments by Manager Service Error:", error);
    return {
      success: false,
      status: 500,
      message: "Internal server error",
      error: error.message,
    };
  }
};

export const updateExpense = async (data) => {
  try {
    let {
      expenseId,
      transactionId,
      property,
      paymentMethod,
      amount,
      handledBy,
      pettyCashType,
      billImage,
      ...expenseData
    } = data;

    if (!expenseId) {
      return {
        success: false,
        status: 400,
        message: "Expense ID is required for update",
      };
    }

    const existingExpense = await Expense.findById(expenseId);
    if (!existingExpense) {
      return {
        success: false,
        status: 404,
        message: "Expense not found",
      };
    }

    // Convert property safely
    if (typeof property === "string") {
      try {
        property = JSON.parse(property);
      } catch (err) {
        return {
          success: false,
          status: 400,
          message: "Invalid property format",
        };
      }
    }

    // Validate required fields
    if (
      !property?.id ||
      !property?.name ||
      !paymentMethod ||
      !amount ||
      !expenseData.title ||
      !expenseData.type ||
      !expenseData.category ||
      !expenseData.date
    ) {
      return {
        success: false,
        status: 400,
        message: "Missing required fields",
      };
    }

    amount = Number(amount);

    // ✅ If new bill image uploaded → delete old one and upload new
    if (billImage) {
      if (existingExpense.imageUrl) {
        await deleteFromFirebase(existingExpense.imageUrl);
      }
      try {
        const imageUrl = await uploadToFirebase(
          billImage,
          "expense-images",
          true
        );
        existingExpense.imageUrl = imageUrl;
      } catch (err) {
        console.error("Image upload failed:", err);
      }
    }

    // ✅ Petty cash adjustment logic
    if (existingExpense.paymentMethod === "Petty Cash") {
      const oldAmount = Number(existingExpense.amount);
      const newAmount = Number(amount);
      const difference = oldAmount - newAmount; // +ve = refund, -ve = deduct more

      if (difference !== 0) {
        if (existingExpense.pettyCashType === "inHand") {
          await sendRPCRequest(CLIENT_PATTERN.PETTYCASH.ADD_PETTYCASH, {
            manager: handledBy,
            pettyCashType: "inHand",
            inHandAmount: difference, // refund or deduct
          });
        }

        if (existingExpense.pettyCashType === "inAccount") {
          await sendRPCRequest(CLIENT_PATTERN.PETTYCASH.ADD_PETTYCASH, {
            manager: handledBy,
            pettyCashType: "inAccount",
            inAccountAmount: difference, // refund or deduct
          });
        }
      }
    }

    // ✅ Update fields
    existingExpense.transactionId =
      transactionId || existingExpense.transactionId;
    existingExpense.property = property || existingExpense.property;
    existingExpense.paymentMethod =
      paymentMethod || existingExpense.paymentMethod;
    existingExpense.amount = amount || existingExpense.amount;
    existingExpense.handledBy = handledBy || existingExpense.handledBy;
    existingExpense.pettyCashType =
      paymentMethod === "Petty Cash" ? pettyCashType : undefined;

    Object.assign(existingExpense, expenseData);

    await existingExpense.save();

    await createAccountLog({
      logType: "Expense",
      action: "Update",
      description: `Expense '${existingExpense.title}' (ID: ${existingExpense._id}) updated.`,
      amount: -existingExpense.amount,
      propertyId: existingExpense.property.id,
      performedBy: data.handledBy || "System",
      referenceId: existingExpense._id,
    });

    return {
      success: true,
      status: 200,
      message: "Expense updated successfully with petty cash adjustment",
      data: existingExpense,
    };
  } catch (error) {
    console.error("[ACCOUNTS] Error in updateExpense:", error);
    return {
      success: false,
      status: 500,
      message: "An internal server error occurred while updating expense.",
      error: error.message,
    };
  }
};
