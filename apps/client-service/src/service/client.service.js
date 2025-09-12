import Client from "../models/client.modal.js";

export const getClientByEmail = async (email) => {
  try {
    if (!email) {
      return {
        success: false,
        status: 400,
        message: "Email is required.",
      };
    }

    const client = await Client.findOne({ email, isDeleted: false });

    if (client) {
      return {
        success: true,
        status: 200,
        message: "Client found successfully.",
        data: client,
      };
    } else {
      return {
        success: false,
        status: 404,
        message: "Client with this email does not exist.",
      };
    }
  } catch (error) {
    console.error("Error in getClientByEmail service:", error);
    return {
      success: false,
      status: 500,
      message: "An internal server error occurred while fetching the client.",
    };
  }
};
