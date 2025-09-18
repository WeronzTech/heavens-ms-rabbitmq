export const CLIENT_PATTERN = {
  CLIENT: {
    GET_CLIENT_BY_EMAIL: "get_client_by_email",
    VALIDATE_CREDENTIALS: "client_validate_credentials",
    REGISTER_ADMIN: "client_register_admin",
    REGISTER_CLIENT: "client_register_client",
    VERIFY_EMAIL: "client_verify_email",
    FORGOT_PASSWORD: "client_forgot_password",
    RESET_PASSWORD: "client_reset_password",
    APPROVE_CLIENT: "client_approve_client",
  },
  MANAGER: {
    REGISTER_MANAGER: "client_register_manager",
    GET_MANAGER_BY_EMAIL: "client_get_manager_by_email",
    VALIDATE_MANAGER_CREDENTIALS: "client_validate_manager_credentials",
    FORGOT_PASSWORD_MANAGER: "client_forgot_password_manager",
    RESET_PASSWORD_MANAGER: "client_reset_password_manager",
    GET_ALL_MANAGERS: "client_get_all_managers",
    GET_MANAGER_BY_ID: "client_get_manager_by_id",
    EDIT_MANAGER: "client_edit_manager",
    DELETE_MANAGER: "client_delete_manager",
    CHANGE_MANAGER_STATUS: "client_change_manager_status",
  },
};
