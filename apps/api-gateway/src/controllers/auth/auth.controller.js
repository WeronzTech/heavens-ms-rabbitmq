import { sendRPCRequest } from "../../../../../libs/common/rabbitMq.js";
import { AUTH_PATTERN } from "../../../../../libs/patterns/auth/auth.pattern.js";

export const tenantLogin = async (req, res) => {
  const { email, password } = req.body;
  const response = await sendRPCRequest(AUTH_PATTERN.AUTH.TENANT_LOGIN, {
    email,
    password,
  });

  if (response.status === 200) {
    return res.status(200).json(response?.data);
  } else {
    return res.status(response?.status).json({ message: response.message });
  }
};

export const userLogin = async (req, res) => {
  const { email, password, deviceId } = req.body;
  console.log("Here");
  const response = await sendRPCRequest(AUTH_PATTERN.AUTH.USER_LOGIN, {
    email,
    password,
    deviceId,
  });

  if (response.status === 200) {
    return res.status(200).json(response?.data);
  } else {
    return res.status(response?.status).json({ message: response.message });
  }
};

export const forgotPasswordUser = async (req, res) => {
  const { email } = req.body;

  const response = await sendRPCRequest(
    AUTH_PATTERN.AUTH.FORGOT_PASSWORD_USER,
    { email },
  );

  return res.status(response.status).json(response);
};

export const resetPassword = async (req, res) => {
  const { token, password } = req.body;

  const response = await sendRPCRequest(AUTH_PATTERN.AUTH.RESET_PASSWORD_USER, {
    token,
    password,
  });

  return res.status(response.status).json(response);
};

export const refreshAccessToken = async (req, res) => {
  const { refreshToken, deviceId } = req.body;

  const response = await sendRPCRequest(
    AUTH_PATTERN.AUTH.REFRESH_ACCESS_TOKEN,
    { refreshToken, deviceId },
  );

  return res.status(response.status).json(response);
};
