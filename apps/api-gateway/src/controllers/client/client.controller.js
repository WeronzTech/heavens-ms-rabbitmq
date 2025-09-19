import { sendRPCRequest } from "../../../../../libs/common/rabbitMq.js";
import { CLIENT_PATTERN } from "../../../../../libs/patterns/client/client.pattern.js";

export const getClientByEmail = async (req, res) => {
  try {
    const { email } = req.body;

    const client = await sendRPCRequest(
      CLIENT_PATTERN.CLIENT.GET_CLIENT_BY_EMAIL,
      { email }
    );

    if (client.status === 200) {
      res.status(200).json(client);
    } else {
      res.status(client.status).json(client);
    }
  } catch (error) {
    console.error("Error in getClientByEmail service:", error);
    res.status(500).json({
      success: false,
      status: 500,
      message: "An internal server error occurred while fetching the client.",
    });
  }
};

export const validateClientCredentials = async (req, res) => {
  const { email, password } = req.body;
  try {
    const client = await sendRPCRequest(
      CLIENT_PATTERN.CLIENT.VALIDATE_CREDENTIALS,
      { email, password }
    );

    if (client.status === 200) {
      res.status(200).json(client);
    } else {
      res.status(client.status).json(client);
    }
  } catch (error) {
    console.error("Error during client validation:", error);
    res.status(500).json({
      success: false,
      status: 500,
      message: "Internal Server Error",
    });
  }
};

export const registerAdmin = async (req, res) => {
  const { name, email, password, contact } = req.body;
  try {
    const admin = await sendRPCRequest(CLIENT_PATTERN.CLIENT.REGISTER_ADMIN, {
      name,
      email,
      password,
      contact,
    });

    if (admin.status === 201) {
      res.status(201).json(admin);
    } else {
      res.status(admin.status).json(admin);
    }
  } catch (error) {
    console.error("Error creating admin:", error.message);
    res.status(500).json({
      success: false,
      status: 500,
      message: "Internal server error",
    });
  }
};

export const registerClient = async (req, res) => {
  const { name, email, password, companyName, address, contact, role } =
    req.body;
  try {
    const client = await sendRPCRequest(CLIENT_PATTERN.CLIENT.REGISTER_CLIENT, {
      name,
      email,
      password,
      companyName,
      address,
      contact,
      role,
    });
    if (client.status === 201) {
      res.status(201).json(client);
    } else {
      res.status(client.status).json(client);
    }
  } catch (error) {
    console.error("Error registering client:", error);
    res.status(500).json({
      success: false,
      status: 500,
      message: "Internal Server Error",
    });
  }
};

export const verifyEmail = async (req, res) => {
  const { token } = req.body;
  try {
    const client = await sendRPCRequest(CLIENT_PATTERN.CLIENT.VERIFY_EMAIL, {
      token,
    });
    if (client.status === 200) {
      res.status(200).json(client);
    } else {
      res.status(client.status).json(client);
    }
  } catch (error) {
    console.error("Error verifying email:", error);
    res
      .status(500)
      .json({ success: false, status: 500, message: "Internal Server Error" });
  }
};

export const forgotPassword = async (req, res) => {
  const { email } = req.body;
  try {
    const client = await sendRPCRequest(CLIENT_PATTERN.CLIENT.FORGOT_PASSWORD, {
      email,
    });
    if (client.status === 200) {
      res.status(200).json(client);
    } else {
      res.status(client.status).json(client);
    }
  } catch (error) {
    console.error("Error in forgot password service:", error);
    res
      .status(500)
      .json({ success: false, status: 500, message: "Internal Server Error" });
  }
};

export const resetPassword = async (req, res) => {
  const { token, password } = req.body;
  try {
    const client = await sendRPCRequest(CLIENT_PATTERN.CLIENT.RESET_PASSWORD, {
      token,
      password,
    });

    if (client.status === 200) {
      res.status(200).json(client);
    } else {
      res.status(client.status).json(client);
    }
  } catch (error) {
    console.error("Error in reset password service:", error);
    res
      .status(500)
      .json({ success: false, status: 500, message: "Internal Server Error" });
  }
};

export const approveClient = async (req, res) => {
  const { clientId, permissions } = req.body;
  try {
    const client = await sendRPCRequest(CLIENT_PATTERN.CLIENT.APPROVE_CLIENT, {
      clientId,
      permissions,
    });

    if (client.status === 200) {
      res.status(200).json(client);
    } else {
      res.status(client.status).json(client);
    }
  } catch (error) {
    console.error("Error approving client:", error);
    res.status(500).json({
      success: false,
      status: 500,
      message: "Server error during approval",
    });
  }
};
