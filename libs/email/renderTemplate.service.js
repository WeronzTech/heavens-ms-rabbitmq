import { renderTemplate } from "./template.service.js";

export const renderVerificationSuccess = async () => {
  return renderTemplate("email-verification-success", {});
};

export const renderVerificationError = async (message = "") => {
  return renderTemplate("email-verification-error", {
    message:
      message ||
      "This verification link is invalid or has expired. Please request a new verification email from the app.",
  });
};

export const renderVerificationServerError = async () => {
  return renderTemplate("email-verification-server-error", {});
};
