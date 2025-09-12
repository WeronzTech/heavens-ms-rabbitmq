import axios from "axios";

export const registerStudentInAuthService = async (student) => {
  await axios.post(
    `${process.env.AUTH_SERVICE_URL}/api/v2/auth/internal/registerStudent`,
    {
      studentId: student._id,
      name: student.name,
      email: student.email,
      password: student.password,
      userType: student.userType,
      isAdminApproved: false,
    },
    {
      headers: {
        "x-internal-key": process.env.INTERNAL_SECRET_KEY,
      },
    }
  );
};

export const approveStudentInAuthService = async (studentId) => {
  try {
    const response = await axios.put(
      `${process.env.AUTH_SERVICE_URL}/api/v2/auth/internal/residents/${studentId}/approval`,
      {isAdminApproved: true},
      {
        headers: {
          "x-internal-key": process.env.INTERNAL_SECRET_KEY,
          "Content-Type": "application/json",
        },
      }
    );
    return response.data;
  } catch (error) {
    if (error.response) {
      const {status, data} = error.response;
      console.error("Auth service responded with error:", data);
      const err = new Error(data.error || "Auth service error");
      err.status = status;
      throw err;
    }

    console.error("Auth service approval error:", error.message);
    throw new Error("Failed to update student approval in auth service");
  }
};
