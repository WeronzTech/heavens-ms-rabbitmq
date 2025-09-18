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

export const createAddon = (req, res) => {
  const { body, files } = req;
  const payload = { ...body };

  if (files?.itemImage?.[0]) {
    payload.itemImage = {
      buffer: files.itemImage[0].buffer.toString("base64"),
      originalname: files.itemImage[0].originalname,
    };
  }

  return handleRPCAndRespond(res, INVENTORY_PATTERN.ADDON.CREATE, payload);
};

export const getAllAddons = (req, res) =>
  handleRPCAndRespond(res, INVENTORY_PATTERN.ADDON.GET_ALL, req.query);

export const getAddonById = (req, res) =>
  handleRPCAndRespond(res, INVENTORY_PATTERN.ADDON.GET_BY_ID, {
    addonId: req.params.addonId,
  });

export const updateAddon = (req, res) => {
  const { body, files, params } = req;
  const payload = { ...body, addonId: params.addonId };

  if (files?.itemImage?.[0]) {
    payload.itemImage = {
      buffer: files.itemImage[0].buffer.toString("base64"),
      originalname: files.itemImage[0].originalname,
    };
  }

  return handleRPCAndRespond(res, INVENTORY_PATTERN.ADDON.UPDATE, payload);
};

export const updateAddonAvailability = (req, res) =>
  handleRPCAndRespond(res, INVENTORY_PATTERN.ADDON.UPDATE_AVAILABILITY, {
    ...req.body,
    addonId: req.params.addonId,
  });

export const deleteAddon = (req, res) =>
  handleRPCAndRespond(res, INVENTORY_PATTERN.ADDON.DELETE, {
    addonId: req.params.addonId,
  });

export const getAddonByPropertyId = (req, res) =>
  handleRPCAndRespond(res, INVENTORY_PATTERN.ADDON.GET_BY_PROPERTY, {
    userId: req.userAuth,
  });
