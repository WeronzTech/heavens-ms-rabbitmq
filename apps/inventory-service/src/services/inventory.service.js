import mongoose from "mongoose";
import { Parser } from "json2csv";
import PDFDocument from "pdfkit";
import moment from "moment";
import Inventory from "../models/inventory.model.js";
import InventoryLog from "../models/inventoryLog.model.js";
import QueuedInventory from "../models/queuedInventory.model.js";
import Kitchen from "../models/kitchen.model.js";
import { drawTable, drawWeeklyUsageTable } from "../utils/helpers.js";
import { sendRPCRequest } from "../../../../libs/common/rabbitMq.js";
import { ACCOUNTS_PATTERN } from "../../../../libs/patterns/accounts/accounts.pattern.js";
import { ACCOUNT_SYSTEM_NAMES } from "../../../accounts-service/src/config/accountMapping.config.js";
// const ACCOUNT_NAMES_CONST = {
//   INVENTORY_ASSET: "Inventory",
//   BANK_ACCOUNT: "Bank Account",
// };

// --- Service Functions ---

export const addInventory = async (data) => {
  try {
    const {
      productName,
      quantityType,
      stockQuantity,
      lowStockQuantity,
      kitchenId,
      categoryId,
      pricePerUnit,
      userAuth,
    } = data;

    if (!Array.isArray(kitchenId) || kitchenId.length === 0) {
      return {
        success: false,
        status: 400,
        message: "kitchenId must be a non-empty array",
      };
    }
    const totalCost = pricePerUnit * stockQuantity;
    const existingItem = await Inventory.findOne({
      productName,
      kitchenId: { $in: kitchenId },
    });

    // if (existingItem) {
    //   if (existingItem.pricePerUnit !== pricePerUnit) {
    //     if (existingItem.stockQuantity > existingItem.lowStockQuantity) {
    //       await QueuedInventory.create({
    //         productName,
    //         quantityType,
    //         stockQuantity,
    //         lowStockQuantity,
    //         kitchenId,
    //         categoryId,
    //         pricePerUnit,
    //         totalCost,
    //         linkedInventoryId: existingItem._id,
    //         status: "pending",
    //       });
    //       return {
    //         success: true,
    //         status: 202,
    //         message: "Price differs and stock is not zero. Item queued.",
    //         data: existingItem,
    //       };
    //     } else {
    //       existingItem.pricePerUnit = pricePerUnit;
    //       existingItem.totalCost = totalCost;
    //       existingItem.stockQuantity = stockQuantity;
    //       await existingItem.save();
    //       await InventoryLog.create({
    //         inventoryId: existingItem._id,
    //         kitchenId: kitchenId[0],
    //         productName,
    //         quantityChanged: stockQuantity,
    //         newStock: stockQuantity,
    //         operation: "price_update_and_add",
    //         performedBy: userAuth,
    //         notes: "Stock added after price change",
    //       });
    //       return {
    //         success: true,
    //         status: 200,
    //         message: "Inventory updated successfully.",
    //         data: existingItem,
    //       };
    //     }
    //   } else {
    //     existingItem.stockQuantity += stockQuantity;
    //     existingItem.totalCost += totalCost;
    //     await existingItem.save();
    //     await InventoryLog.create({
    //       inventoryId: existingItem._id,
    //       kitchenId: kitchenId[0],
    //       productName,
    //       quantityChanged: stockQuantity,
    //       newStock: existingItem.stockQuantity,
    //       operation: "add",
    //       performedBy: userAuth,
    //       notes: "Stock added (price matched)",
    //     });
    //     return {
    //       success: true,
    //       status: 200,
    //       message: "Inventory updated successfully.",
    //       data: existingItem,
    //     };
    //   }
    // }
    if (existingItem) {
      return {
        success: false,
        status: 400,
        message: "Inventory item already exists.",
      };
    }

    const newItem = await Inventory.create({
      productName,
      quantityType,
      stockQuantity,
      lowStockQuantity,
      kitchenId,
      categoryId,
      pricePerUnit,
      totalCost,
    });
    await InventoryLog.create({
      inventoryId: newItem._id,
      kitchenId: kitchenId[0],
      productName,
      quantityChanged: stockQuantity,
      newStock: stockQuantity,
      operation: "add",
      performedBy: userAuth,
    });

    if (newItem.totalCost > 0) {
      try {
        await sendRPCRequest(ACCOUNTS_PATTERN.ACCOUNTING.CREATE_JOURNAL_ENTRY, {
          date: new Date(),
          description: `Inventory purchase: ${newItem.productName}`,
          kitchenId: newItem.kitchenId[0], // Log the kitchen
          // propertyId: ??? // Need to fetch propertyId from kitchen
          transactions: [
            {
              systemName: ACCOUNT_SYSTEM_NAMES.ASSET_INVENTORY,
              debit: newItem.totalCost,
            },
            {
              systemName: ACCOUNT_SYSTEM_NAMES.ASSET_CORE_BANK,
              credit: newItem.totalCost,
            },
          ],
          referenceId: newItem._id,
          referenceType: "Inventory",
        });
      } catch (rpcError) {
        console.error(
          `[InventoryService] Failed to create journal entry for inventory ${newItem._id}: ${rpcError.message}`
        );
      }
    }

    return {
      success: true,
      status: 201,
      message: "Inventory added successfully.",
      data: newItem,
    };
  } catch (err) {
    return { success: false, status: 400, message: err.message };
  }
};

export const getInventory = async (data) => {
  try {
    const { search = "", propertyId, kitchenId, page = 1, limit = 10 } = data;
    const query = {
      ...(search && { productName: { $regex: search, $options: "i" } }),
    };

    if (kitchenId) {
      if (!mongoose.Types.ObjectId.isValid(kitchenId))
        return {
          success: false,
          status: 400,
          message: "Invalid kitchenId format.",
        };
      query.kitchenId = kitchenId;
    } else if (propertyId) {
      if (!mongoose.Types.ObjectId.isValid(propertyId))
        return {
          success: false,
          status: 400,
          message: "Invalid propertyId format.",
        };
      const kitchens = await Kitchen.find({ propertyId }).select("_id");
      const kitchenIds = kitchens.map((k) => k._id);
      if (kitchenIds.length === 0)
        return {
          success: true,
          status: 200,
          data: { data: [], total: 0, page: +page, limit: +limit },
        };
      query.kitchenId = { $in: kitchenIds };
    }

    const total = await Inventory.countDocuments(query);
    const inventoryData = await Inventory.find(query)
      .populate("categoryId")
      .skip((page - 1) * limit)
      .limit(+limit)
      .sort({ createdAt: -1 });

    return {
      success: true,
      status: 200,
      message: "Inventory retrieved successfully.",
      data: { data: inventoryData, total, page: +page, limit: +limit },
    };
  } catch (err) {
    return { success: false, status: 500, message: err.message };
  }
};

export const editInventory = async (data) => {
  try {
    const {
      inventoryId,
      productName,
      categoryId,
      kitchenId,
      stockQuantity,
      quantityType,
      pricePerUnit,
      lowStockQuantity,
      userAuth,
    } = data;

    if (!mongoose.Types.ObjectId.isValid(inventoryId))
      return {
        success: false,
        status: 400,
        message: "Invalid inventory ID format.",
      };
    const item = await Inventory.findById(inventoryId);
    if (!item)
      return {
        success: false,
        status: 404,
        message: "Inventory item not found.",
      };

    const logEntries = [];
    const createLog = (field, oldValue, newValue, notes) => {
      logEntries.push({
        inventoryId,
        kitchenId: item.kitchenId,
        productName: item.productName,
        quantityChanged: 0,
        newStock: item.stockQuantity,
        operation: "edit",
        editedField: field,
        performedBy: userAuth,
        notes,
      });
    };

    if (productName && item.productName !== productName) {
      createLog(
        "productName",
        item.productName,
        productName,
        `Name changed from "${item.productName}" to "${productName}"`
      );
      item.productName = productName;
    }
    if (categoryId && item.categoryId.toString() !== categoryId) {
      createLog("categoryId", item.categoryId, categoryId, "Category changed.");
      item.categoryId = categoryId;
    }
    // Similar checks for other fields...

    item.totalCost = item.pricePerUnit * item.stockQuantity;
    if (logEntries.length > 0) await InventoryLog.insertMany(logEntries);

    const updatedItem = await item.save();
    return {
      success: true,
      status: 200,
      message: "Inventory item updated.",
      data: updatedItem,
    };
  } catch (err) {
    return { success: false, status: 500, message: err.message };
  }
};

export const deleteInventory = async ({ inventoryId, userAuth }) => {
  try {
    const deletedItem = await Inventory.findByIdAndDelete(inventoryId);
    if (!deletedItem)
      return { success: false, status: 404, message: "Item not found" };

    await InventoryLog.create({
      inventoryId,
      productName: deletedItem.productName,
      quantityChanged: 0,
      newStock: 0,
      operation: "remove",
      performedBy: userAuth,
      notes: "Inventory deleted",
    });
    return { success: true, status: 200, message: "Deleted successfully" };
  } catch (err) {
    return { success: false, status: 400, message: err.message };
  }
};

export const useInventory = async (data) => {
  try {
    const { inventoryId, quantity, kitchenId, userAuth } = data;
    if (!kitchenId)
      return { success: false, status: 400, message: "kitchenId is required" };

    const item = await Inventory.findById(inventoryId);
    if (!item)
      return { success: false, status: 404, message: "Item not found" };
    if (item.kitchenId.toString() !== kitchenId)
      return {
        success: false,
        status: 403,
        message: "This item is not assigned to this kitchen",
      };
    if (item.stockQuantity < quantity)
      return { success: false, status: 400, message: "Insufficient stock" };

    item.stockQuantity -= quantity;
    await item.save();
    await InventoryLog.create({
      inventoryId,
      kitchenId,
      productName: item.productName,
      quantityChanged: -quantity,
      newStock: item.stockQuantity,
      operation: "remove",
      performedBy: userAuth,
      notes: "Daily usage",
    });

    return { success: true, status: 200, data: item };
  } catch (err) {
    return { success: false, status: 400, message: err.message };
  }
};

export const addDeadStock = async (data) => {
  try {
    const { inventoryId, quantity, kitchenId, notes, userAuth } = data;

    if (
      !mongoose.Types.ObjectId.isValid(inventoryId) ||
      !mongoose.Types.ObjectId.isValid(kitchenId)
    )
      return { success: false, status: 400, message: "Invalid ID format." };
    if (!quantity || quantity <= 0)
      return {
        success: false,
        status: 400,
        message: "Quantity must be a positive number.",
      };
    if (!notes)
      return {
        success: false,
        status: 400,
        message: "A reason (notes) is required.",
      };

    const item = await Inventory.findById(inventoryId);
    if (!item)
      return {
        success: false,
        status: 404,
        message: "Inventory item not found.",
      };
    if (!item.kitchenId.some((id) => id.toString() === kitchenId))
      return {
        success: false,
        status: 403,
        message: "Item not assigned to the specified kitchen.",
      };
    if (item.stockQuantity < quantity)
      return { success: false, status: 400, message: "Insufficient stock." };

    item.stockQuantity -= quantity;
    item.totalCost = item.pricePerUnit * item.stockQuantity;
    await item.save();

    await InventoryLog.create({
      inventoryId,
      kitchenId,
      productName: item.productName,
      quantityChanged: -quantity,
      newStock: item.stockQuantity,
      operation: "remove",
      performedBy: userAuth,
      notes: `Dead Stock: ${notes}`,
    });

    return { success: true, status: 200, data: item };
  } catch (err) {
    return { success: false, status: 500, message: err.message };
  }
};

export const getDeadStockLogs = async (data) => {
  try {
    const { search = "", propertyId, kitchenId, page = 1, limit = 10 } = data;
    const query = { notes: { $regex: /^Dead Stock:/, $options: "i" } };

    if (search) query.productName = { $regex: search, $options: "i" };

    if (kitchenId) {
      if (!mongoose.Types.ObjectId.isValid(kitchenId))
        return {
          success: false,
          status: 400,
          message: "Invalid kitchenId format.",
        };
      query.kitchenId = kitchenId;
    } else if (propertyId) {
      if (!mongoose.Types.ObjectId.isValid(propertyId))
        return {
          success: false,
          status: 400,
          message: "Invalid propertyId format.",
        };
      const kitchens = await Kitchen.find({ propertyId }).select("_id");
      const kitchenIds = kitchens.map((k) => k._id);
      if (kitchenIds.length === 0)
        return {
          success: true,
          status: 200,
          data: { data: [], total: 0, page: +page, limit: +limit },
        };
      query.kitchenId = { $in: kitchenIds };
    }

    const total = await InventoryLog.countDocuments(query);
    const logs = await InventoryLog.find(query)
      .populate("inventoryId", "productName quantityType categoryId")
      .populate("kitchenId", "name")
      .populate("performedBy", "name")
      .skip((page - 1) * limit)
      .limit(+limit)
      .sort({ createdAt: -1 });

    return {
      success: true,
      status: 200,
      data: { data: logs, total, page: +page, limit: +limit },
    };
  } catch (err) {
    return { success: false, status: 500, message: err.message };
  }
};

export const updateStock = async (data) => {
  try {
    const { inventoryId, quantity, kitchenId, userAuth } = data;

    const item = await Inventory.findById(inventoryId);
    if (!item)
      return { success: false, status: 404, message: "Item not found" };

    item.stockQuantity += quantity;
    await item.save();

    await InventoryLog.create({
      inventoryId,
      kitchenId,
      productName: item.productName,
      quantityChanged: quantity,
      newStock: item.stockQuantity,
      operation: "add",
      performedBy: userAuth,
      notes: "Stock updated",
    });

    return { success: true, status: 200, data: item };
  } catch (err) {
    return { success: false, status: 400, message: err.message };
  }
};

export const getLowStockItems = async (data) => {
  try {
    const { propertyId, search = "" } = data;
    const query = {
      ...(propertyId && { propertyId }),
      ...(search && { productName: { $regex: search, $options: "i" } }),
      $expr: { $lte: ["$stockQuantity", "$lowStockQuantity"] },
    };
    const items = await Inventory.find(query).populate("categoryId");

    return { success: true, status: 200, data: items };
  } catch (err) {
    return { success: false, status: 500, message: err.message };
  }
};

export const downloadLowStockCsv = async (data) => {
  try {
    const { propertyId, search = "" } = data;
    const items = await Inventory.find({
      ...(propertyId && { propertyId }),
      ...(search && { productName: { $regex: search, $options: "i" } }),
      $expr: { $lte: ["$stockQuantity", "$lowStockQuantity"] },
    });

    const fields = [
      "productName",
      "quantityType",
      "stockQuantity",
      "lowStockQuantity",
    ];
    const parser = new Parser({ fields });
    const csv = parser.parse(items);

    return {
      success: true,
      status: 200,
      data: csv,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": 'attachment; filename="low_stock_inventory.csv"',
      },
    };
  } catch (err) {
    return { success: false, status: 500, message: err.message };
  }
};

export const getInventoryById = async ({ inventoryId }) => {
  try {
    if (!inventoryId)
      return { success: false, status: 400, message: "Invalid inventory ID" };
    const inventoryItem = await Inventory.findById(inventoryId).populate(
      "categoryId"
    );
    if (!inventoryItem)
      return {
        success: false,
        status: 404,
        message: "Inventory item not found",
      };

    return { success: true, status: 200, data: inventoryItem };
  } catch (err) {
    return { success: false, status: 500, message: "Server error" };
  }
};

export const manuallyApplyQueuedInventory = async (data) => {
  try {
    const { queuedId, userAuth } = data;

    const queued = await QueuedInventory.findById(queuedId);
    if (!queued || queued.status !== "pending")
      return {
        success: false,
        status: 404,
        message: "Pending queued item not found",
      };

    const inventory = await Inventory.findById(queued.linkedInventoryId);
    if (!inventory)
      return {
        success: false,
        status: 404,
        message: "Linked inventory not found",
      };

    inventory.pricePerUnit = queued.pricePerUnit;
    inventory.totalCost = queued.totalCost;
    inventory.stockQuantity = queued.stockQuantity;
    inventory.lowStockQuantity = queued.lowStockQuantity;
    await inventory.save();

    await InventoryLog.create({
      inventoryId: inventory._id,
      kitchenId: queued.kitchenId[0],
      productName: inventory.productName,
      quantityChanged: queued.stockQuantity,
      newStock: queued.stockQuantity,
      operation: "manual_apply_queued",
      performedBy: userAuth,
      notes: "Queued inventory manually applied",
    });

    queued.status = "applied";
    await queued.save();

    return {
      success: true,
      status: 200,
      message: "Queued inventory applied manually",
      data: inventory,
    };
  } catch (error) {
    return { success: false, status: 500, message: "Internal server error" };
  }
};

export const downloadDeadStockReport = async (data) => {
  try {
    const { propertyId, kitchenId, format = "csv", startDate, endDate } = data;
    const query = { notes: { $regex: /^Dead Stock:/, $options: "i" } };

    if (
      startDate &&
      endDate &&
      moment(startDate).isValid() &&
      moment(endDate).isValid()
    ) {
      query.createdAt = {
        $gte: moment(startDate).startOf("day").toDate(),
        $lte: moment(endDate).endOf("day").toDate(),
      };
    }

    if (kitchenId) {
      query.kitchenId = kitchenId;
    } else if (propertyId) {
      const kitchens = await Kitchen.find({ propertyId }).select("_id");
      query.kitchenId = { $in: kitchens.map((k) => k._id) };
    }

    const logs = await InventoryLog.find(query)
      .populate("inventoryId", "productName quantityType")
      .populate("kitchenId", "name")
      .populate("performedBy", "name")
      .sort({ createdAt: -1 })
      .lean();

    if (format.toLowerCase() === "pdf") {
      const doc = new PDFDocument({ margin: 40, size: "A4" });
      const buffers = [];
      doc.on("data", buffers.push.bind(buffers));

      doc
        .fontSize(18)
        .font("Helvetica-Bold")
        .text("Dead Stock Report", { align: "center" })
        .moveDown();
      drawTable(doc, logs);
      doc.end();

      return new Promise((resolve) => {
        doc.on("end", () => {
          resolve({
            success: true,
            status: 200,
            data: Buffer.concat(buffers),
            headers: {
              "Content-Type": "application/pdf",
              "Content-Disposition":
                'attachment; filename="dead-stock-report.pdf"',
            },
          });
        });
      });
    } else {
      const fields = [
        { label: "Date", value: "createdAt" },
        { label: "Product Name", value: "inventoryId.productName" },
        { label: "Kitchen", value: "kitchenId.name" },
        { label: "Quantity Removed", value: "quantityChanged" },
        { label: "Unit Type", value: "inventoryId.quantityType" },
        { label: "Reason", value: "notes" },
        { label: "Logged By", value: "performedBy.name" },
      ];
      const formattedLogs = logs.map((log) => ({
        ...log,
        createdAt: moment(log.createdAt).format("YYYY-MM-DD HH:mm:ss"),
        quantityChanged: Math.abs(log.quantityChanged),
        notes: log.notes.replace(/^Dead Stock: /, ""),
      }));
      const csv = new Parser({ fields }).parse(formattedLogs);
      return {
        success: true,
        status: 200,
        data: csv,
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": 'attachment; filename="dead-stock-report.csv"',
        },
      };
    }
  } catch (err) {
    return { success: false, status: 500, message: err.message };
  }
};

export const downloadWeeklyUsageReport = async (data) => {
  try {
    const { propertyId, kitchenId, format = "csv", startDate, endDate } = data;

    let reportStartDate = startDate
      ? moment(startDate).startOf("day").toDate()
      : moment().startOf("week").toDate();
    let reportEndDate = endDate
      ? moment(endDate).endOf("day").toDate()
      : moment().endOf("week").toDate();

    const query = {
      notes: "Daily usage",
      createdAt: { $gte: reportStartDate, $lte: reportEndDate },
    };

    if (kitchenId) {
      query.kitchenId = kitchenId;
    } else if (propertyId) {
      const kitchens = await Kitchen.find({ propertyId }).select("_id");
      const kitchenIds = kitchens.map((k) => k._id);
      if (kitchenIds.length > 0) {
        query.kitchenId = { $in: kitchenIds };
      } else {
        return { status: 400, error: "No kitchens found." };
      }
    }

    const logs = await InventoryLog.find(query)
      .populate("inventoryId", "productName quantityType")
      .sort({ createdAt: "asc" });
    const usageData = new Map();
    logs.forEach((log) => {
      const productId = log.inventoryId._id.toString();
      if (!usageData.has(productId)) {
        usageData.set(productId, {
          productName: log.inventoryId.productName,
          quantityType: log.inventoryId.quantityType,
          days: {},
        });
      }

      const product = usageData.get(productId);
      const dayKey = moment(log.createdAt).format("YYYY-MM-DD");
      const usedQty = Math.abs(log.quantityChanged);

      if (!product.days[dayKey]) {
        product.days[dayKey] = { used: 0, available: log.newStock + usedQty };
      }
      product.days[dayKey].used += usedQty;
    });

    const reportData = Array.from(usageData.values()); // aggregated data
    const reportDates = []; // dates for the report

    for (
      let m = moment(reportStartDate);
      m.isSameOrBefore(reportEndDate);
      m.add(1, "days")
    ) {
      reportDates.push(m.clone());
    }

    reportData.forEach((item) => {
      let lastAvailable = null;
      reportDates.forEach((date) => {
        const dayKey = date.format("YYYY-MM-DD");
        if (item.days[dayKey]) {
          lastAvailable = item.days[dayKey].available - item.days[dayKey].used;
        } else if (lastAvailable !== null) {
          item.days[dayKey] = { available: lastAvailable, used: 0 };
        } else {
          item.days[dayKey] = { available: "-", used: 0 };
        }
      });
    });

    // if (reportData.length === 0) {
    //   return {
    //     status: 400,
    //     error: "No daily usage logs found for the selected period.",
    //   };
    // }

    if (format.toLowerCase() === "pdf") {
      const doc = new PDFDocument({
        margin: 20,
        size: "A4",
        layout: "landscape",
      });
      const buffers = [];
      doc.on("data", buffers.push.bind(buffers));

      doc
        .fontSize(16)
        .font("Helvetica-Bold")
        .text("Weekly Stock Usage Report", { align: "center" })
        .moveDown(2);
      drawWeeklyUsageTable(doc, reportData, reportDates);
      doc.end();

      return new Promise((resolve) => {
        doc.on("end", () => {
          resolve({
            success: true,
            status: 200,
            data: Buffer.concat(buffers),
            headers: {
              "Content-Type": "application/pdf",
              "Content-Disposition":
                'attachment; filename="weekly-usage-report.pdf"',
            },
          });
        });
      });
    } else {
      const fields = [
        { label: "Item Name", value: "productName" },
        { label: "Unit Type", value: "quantityType" },
        ...reportDates.flatMap((date) => [
          {
            label: `${date.format("dddd, MMM D")} - Available`,
            value: `days.${date.format("YYYY-MM-DD")}.available`,
          },
          {
            label: `${date.format("dddd, MMM D")} - Used`,
            value: `days.${date.format("YYYY-MM-DD")}.used`,
          },
        ]),
      ];
      const csv = new Parser({ fields, defaultValue: 0 }).parse(reportData);
      return {
        success: true,
        status: 200,
        data: csv,
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition":
            'attachment; filename="weekly-usage-report.csv"',
        },
      };
    }
  } catch (err) {
    return { success: false, status: 500, message: err.message };
  }
};
