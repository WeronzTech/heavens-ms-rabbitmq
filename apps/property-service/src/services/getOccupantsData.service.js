import axios from "axios";

const userServiceBaseURL =
  process.env.USER_SERVICE_URL || "http://user-service:5005";

export const fetchUserData = async (roomId) => {
  try {
    const response = await axios.get(
      `${userServiceBaseURL}/user/internal/user-data/${roomId}`,
      {
        headers: {
          "Internal-Auth": process.env.INTERNAL_API_SECRET,
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
