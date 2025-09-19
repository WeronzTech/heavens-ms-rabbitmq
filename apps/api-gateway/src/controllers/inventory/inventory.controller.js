import { sendRPCRequest } from "../../../../../libs/common/rabbitMq.js";
import { INVENTORY_PATTERN } from "../../../../../libs/patterns/inventory/inventory.pattern.js";

const handleRPCAndRespond = async (res, pattern, data) => {
  try {
    const response = await sendRPCRequest(pattern, data);
    return res.status(response.status || 500).json(response);
  } catch (error) {
    console.error(`API Gateway Error in ${pattern}:`, error);
    return res
      .status(500)
      .json({ message: "Internal Server Error in API Gateway." });
  }
};

const handleFileDownload = async (res, pattern, data) => {
  try {
    const response = await sendRPCRequest(pattern, data);
    if (response.success) {
      res.set(response.headers);
      res.send(Buffer.from(response.data.data)); // Assuming data is sent as { type: 'Buffer', data: [...] }
    } else {
      res.status(response.status || 500).json(response);
    }
  } catch (error) {
    console.error(
      `API Gateway Error during file download for ${pattern}:`,
      error
    );
    res.status(500).json({ message: "Internal Server Error in API Gateway." });
  }
};

export const addInventory = (req, res) =>
  handleRPCAndRespond(res, INVENTORY_PATTERN.INVENTORY.ADD_INVENTORY, {
    ...req.body,
    userAuth: req.userAuth,
  });
export const getInventory = (req, res) =>
  handleRPCAndRespond(
    res,
    INVENTORY_PATTERN.INVENTORY.GET_INVENTORY,
    req.query
  );
export const editInventory = (req, res) =>
  handleRPCAndRespond(res, INVENTORY_PATTERN.INVENTORY.EDIT_INVENTORY, {
    ...req.body,
    inventoryId: req.params.inventoryId,
    userAuth: req.userAuth,
  });
export const deleteInventory = (req, res) =>
  handleRPCAndRespond(res, INVENTORY_PATTERN.INVENTORY.DELETE_INVENTORY, {
    inventoryId: req.params.inventoryId,
    userAuth: req.userAuth,
  });
export const useInventory = (req, res) =>
  handleRPCAndRespond(res, INVENTORY_PATTERN.INVENTORY.USE_INVENTORY, {
    ...req.body,
    inventoryId: req.params.inventoryId,
    userAuth: req.userAuth,
  });
export const addDeadStock = (req, res) =>
  handleRPCAndRespond(res, INVENTORY_PATTERN.INVENTORY.ADD_DEAD_STOCK, {
    ...req.body,
    inventoryId: req.params.inventoryId,
    userAuth: req.userAuth,
  });
export const getDeadStockLogs = (req, res) =>
  handleRPCAndRespond(
    res,
    INVENTORY_PATTERN.INVENTORY.GET_DEAD_STOCK_LOGS,
    req.query
  );
export const updateStock = (req, res) =>
  handleRPCAndRespond(res, INVENTORY_PATTERN.INVENTORY.UPDATE_STOCK, {
    ...req.body,
    inventoryId: req.params.inventoryId,
    userAuth: req.userAuth,
  });
export const getLowStockItems = (req, res) =>
  handleRPCAndRespond(
    res,
    INVENTORY_PATTERN.INVENTORY.GET_LOW_STOCK_ITEMS,
    req.query
  );
export const getInventoryById = (req, res) =>
  handleRPCAndRespond(res, INVENTORY_PATTERN.INVENTORY.GET_INVENTORY_BY_ID, {
    inventoryId: req.params.inventoryId,
  });
export const manuallyApplyQueuedInventory = (req, res) =>
  handleRPCAndRespond(res, INVENTORY_PATTERN.INVENTORY.MANUALLY_APPLY_QUEUED, {
    queuedId: req.params.queuedId,
    userAuth: req.userAuth,
  });

// File Downloads
export const downloadLowStockCsv = (req, res) =>
  handleFileDownload(
    res,
    INVENTORY_PATTERN.INVENTORY.DOWNLOAD_LOW_STOCK_CSV,
    req.query
  );
export const downloadDeadStockReport = (req, res) =>
  handleFileDownload(
    res,
    INVENTORY_PATTERN.INVENTORY.DOWNLOAD_DEAD_STOCK_REPORT,
    req.query
  );
export const downloadWeeklyUsageReport = (req, res) =>
  handleFileDownload(
    res,
    INVENTORY_PATTERN.INVENTORY.DOWNLOAD_WEEKLY_USAGE_REPORT,
    req.query
  );
