import appSettingsModal from "../models/appSettings.modal.js";
import User from "../models/user.model.js";

export const createAppSettings = async (data) => {
  try {
    const existing = await appSettingsModal.findOne();

    if (existing) {
      return {
        success: false,
        status: 400,
        message: "App settings already exist.",
      };
    }

    const settings = await appSettingsModal.create({
      message: data.message || "",
      isMessageEnabled: data.isMessageEnabled ?? false,
      isApplicationAvailable: data.isApplicationAvailable ?? true,
      isDepositPageEnabled: data.isDepositPageEnabled ?? true,
      properties: data.properties || [],
    });

    return {
      success: true,
      status: 201,
      message: "App settings created successfully.",
      data: settings,
    };
  } catch (error) {
    return {
      success: false,
      status: 500,
      message: error.message,
    };
  }
};

export const getAppSettingsForAdminPanel = async () => {
  try {
    const settings = await appSettingsModal.findOne();

    return {
      success: true,
      status: 200,
      data: settings,
    };

    return {
      success: true,
      status: 200,
      data: settings,
    };
  } catch (error) {
    return {
      success: false,
      status: 500,
      message: error.message,
    };
  }
};

export const getAppSettings = async ({userId}) => {
  try {
    const user = await User.findById(userId).select("stayDetails.propertyId");

    if (!user) {
      return {
        success: false,
        status: 404,
        message: "User not found.",
      };
    }

    const propertyId = user.stayDetails?.propertyId;

    if (!propertyId) {
      return {
        success: false,
        status: 404,
        message: "User is not assigned to any property.",
      };
    }

    const settings = await appSettingsModal.findOne({
      properties: propertyId,
    });

    return {
      success: true,
      status: 200,
      data: settings,
    };
  } catch (error) {
    return {
      success: false,
      status: 500,
      message: error.message,
    };
  }
};

export const updateAppSettings = async (data) => {
  try {
    const settings = await appSettingsModal.findOne();

    if (!settings) {
      return {
        success: false,
        status: 404,
        message: "App settings not found.",
      };
    }

    if (data.message !== undefined) settings.message = data.message;

    if (data.isMessageEnabled !== undefined)
      settings.isMessageEnabled = data.isMessageEnabled;

    if (data.isApplicationAvailable !== undefined)
      settings.isApplicationAvailable = data.isApplicationAvailable;

    if (data.isDepositPageEnabled !== undefined)
      settings.isDepositPageEnabled = data.isDepositPageEnabled;

    if (data.properties !== undefined) settings.properties = data.properties;

    await settings.save();

    return {
      success: true,
      status: 200,
      message: "App settings updated successfully.",
      data: settings,
    };
  } catch (error) {
    return {
      success: false,
      status: 500,
      message: error.message,
    };
  }
};
