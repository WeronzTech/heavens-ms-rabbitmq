import { sendRPCRequest } from "../../../../../libs/common/rabbitMq.js";
import { PROPERTY_PATTERN } from "../../../../../libs/patterns/property/property.pattern.js";

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

// --- Asset Category ---

export const createAssetCategory = (req, res) =>
  handleRPCAndRespond(res, PROPERTY_PATTERN.ASSET_CATEGORY.CREATE, req.body);

export const getAllAssetCategories = (req, res) =>
  handleRPCAndRespond(res, PROPERTY_PATTERN.ASSET_CATEGORY.GET_ALL, req.query);

export const updateAssetCategory = (req, res) =>
  handleRPCAndRespond(res, PROPERTY_PATTERN.ASSET_CATEGORY.UPDATE, {
    id: req.params.id,
    ...req.body,
  });

export const deleteAssetCategory = (req, res) =>
  handleRPCAndRespond(res, PROPERTY_PATTERN.ASSET_CATEGORY.DELETE, {
    id: req.params.id,
  });

// --- Asset ---

const handleRPCWithFiles = (req, res, pattern) => {
  const { body: payload, files, params } = req;
  const filesAsBase64 = {};

  if (files && files.invoice) {
    filesAsBase64.invoice = {
      buffer: files.invoice[0].buffer.toString("base64"),
      originalname: files.invoice[0].originalname,
      mimetype: files.invoice[0].mimetype,
    };
  }

  const data = {
    id: params.id, // For update/delete
    ...payload, // For create/update body
    payload, // For create/update body
    files: filesAsBase64,
  };

  return handleRPCAndRespond(res, pattern, data);
};

export const createAsset = (req, res) =>
  handleRPCWithFiles(req, res, PROPERTY_PATTERN.ASSET.CREATE);

export const createMultipleAssets = (req, res) =>
  handleRPCWithFiles(req, res, PROPERTY_PATTERN.ASSET.CREATE_BULK);

export const getAllAssets = (req, res) =>
  handleRPCAndRespond(res, PROPERTY_PATTERN.ASSET.GET_ALL, req.query);

export const getAssetById = (req, res) =>
  handleRPCAndRespond(res, PROPERTY_PATTERN.ASSET.GET_BY_ID, {
    id: req.params.id,
  });

export const updateAsset = (req, res) =>
  handleRPCWithFiles(req, res, PROPERTY_PATTERN.ASSET.UPDATE);

export const updateAssetStatus = (req, res) =>
  handleRPCAndRespond(res, PROPERTY_PATTERN.ASSET.UPDATE_STATUS, {
    id: req.params.id,
    ...req.body,
  });

export const deleteAsset = (req, res) =>
  handleRPCAndRespond(res, PROPERTY_PATTERN.ASSET.DELETE, {
    id: req.params.id,
  });

export const downloadAssetLabels = async (req, res) => {
  try {
    const response = await sendRPCRequest(
      PROPERTY_PATTERN.ASSET.GET_ASSET_LABELS,
      req.query // Pass filters like ?propertyId=...
    );

    if (!response.success) {
      return res.status(response.status || 404).json(response);
    }

    // On success, the service sends back the PDF as a Base64 string and the headers.
    // Set the headers provided by the service.
    res.setHeader("Content-Type", response.headers["Content-Type"]);
    res.setHeader(
      "Content-Disposition",
      response.headers["Content-Disposition"]
    );

    // Convert the Base64 data back to a binary buffer and send it.
    const pdfBuffer = Buffer.from(response.data, "base64");
    res.send(pdfBuffer);
  } catch (error) {
    console.error(`API Gateway Error in GET_ASSET_LABELS:`, error);
    return res
      .status(500)
      .json({
        success: false,
        message: "Internal Server Error in API Gateway.",
      });
  }
};
