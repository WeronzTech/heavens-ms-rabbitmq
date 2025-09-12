import axios from "axios";

const userServiceBaseURL =
  process.env.USER_SERVICE_URL || "http://user-service:5005";

const clientServiceBaseURL =
  process.env.CLIENT_SERVICE_URL || "http://client-service:5001";

export const fetchUserAuthData = async (identifier) => {
  try {
    const response = await axios.get(
      `${userServiceBaseURL}/user/internal/auth-data/${identifier}`,
      {
        headers: {
          "Internal-Auth": process.env.INTERNAL_SECRET_KEY,
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error(
      "Error fetching user auth data:",
      error.response?.data || error.message
    );
    throw error;
  }
};

export const fetchClientAuthData = async (email, roleName) => {
  try {
    const response = await axios.get(
      `${clientServiceBaseURL}/client/internal/auth-data`,
      {
        params: {email, roleName},
      },
      {
        headers: {
          "Internal-Auth": process.env.INTERNAL_SECRET_KEY,
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error(
      "Error fetching client auth data:",
      error.response?.data || error.message
    );
    throw error;
  }
};
