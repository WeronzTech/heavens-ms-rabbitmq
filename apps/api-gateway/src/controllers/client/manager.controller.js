import { sendRPCRequest } from "../../../../../libs/common/rabbitMq.js";
import { CLIENT_PATTERN } from "../../../../../libs/patterns/client/client.pattern.js";

export const registerManager = async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      password,
      role,
      salary,
      propertyId,
      gender,
      address,
    } = req.body;

    const files = req.files;

    const manager = await sendRPCRequest(
      CLIENT_PATTERN.MANAGER.REGISTER_MANAGER,
      {
        name,
        email,
        phone,
        password,
        role,
        salary,
        propertyId,
        gender,
        address,
        files,
      }
    );

    if (manager.status === 201) {
      res.status(201).json(manager);
    } else {
      res.status(manager.status).json(manager);
    }
  } catch (error) {
    console.error("Error registering manager:", error);
    res.status(500).json({
      success: false,
      status: 500,
      message: "Internal Server Error",
    });
  }
};

export const getManagerByEmail = async (req, res) => {
  try {
    const { email } = req.body;

    const manager = await sendRPCRequest(
      CLIENT_PATTERN.MANAGER.GET_MANAGER_BY_EMAIL,
      { email }
    );

    if (manager.status === 200) {
      res.status(200).json(manager);
    } else {
      res.status(manager.status).json(manager);
    }
  } catch (error) {
    console.error("Error fetching manager by email:", error);
    res
      .status(500)
      .json({ success: false, status: 500, message: "Internal Server Error" });
  }
};

export const validateManagerCredentials = async (req, res) => {
  const { email, password } = req.body;
  try {
    const manager = await sendRPCRequest(
      CLIENT_PATTERN.MANAGER.VALIDATE_MANAGER_CREDENTIALS,
      { email, password }
    );

    if (manager.status === 200) {
      res.status(200).json(manager);
    } else {
      res.status(manager.status).json(manager);
    }
  } catch (error) {
    console.error("Error during manager validation:", error);
    res
      .status(500)
      .json({ success: false, status: 500, message: "Internal Server Error" });
  }
};

export const forgotPasswordManager = async (req, res) => {
  const { email } = req.body;
  try {
    const manager = await sendRPCRequest(
      CLIENT_PATTERN.MANAGER.FORGOT_PASSWORD_MANAGER,
      { email }
    );

    if (manager.status === 200) {
      res.status(200).json(manager);
    } else {
      res.status(manager.status).json(manager);
    }
  } catch (error) {
    console.error("Error in manager forgot password service:", error);
    res
      .status(500)
      .json({ success: false, status: 500, message: "Internal Server Error" });
  }
};

export const resetPasswordManager = async (req, res) => {
  const { token, password } = req.body;
  try {
    const manager = await sendRPCRequest(
      CLIENT_PATTERN.MANAGER.RESET_PASSWORD_MANAGER,
      { token, password }
    );

    if (manager.status === 200) {
      res.status(200).json(manager);
    } else {
      res.status(manager.status).json(manager);
    }
  } catch (error) {
    console.error("Error in manager reset password service:", error);
    res
      .status(500)
      .json({ success: false, status: 500, message: "Internal Server Error" });
  }
};

export const getAllManagers = async (req, res) => {
  try {
    const { propertyId, joinDate, status, name } = req.query;

    const manager = await sendRPCRequest(
      CLIENT_PATTERN.MANAGER.GET_ALL_MANAGERS,
      { propertyId, joinDate, status, name }
    );

    if (manager.status === 200) {
      res.status(200).json(manager);
    } else {
      res.status(manager.status).json(manager);
    }
  } catch (error) {
    console.error("Error during manager retrieval:", error);
    res
      .status(500)
      .json({ success: false, status: 500, message: "Internal Server Error" });
  }
};

// export const getManagerById = async (data) => {
//   try {
//     const { id } = data;
//     const manager = await Manager.findById(id);
//     if (!manager) {
//       return { success: false, status: 404, message: "Manager not found." };
//     }

//     const managerObject = manager.toObject();
//     if (manager.propertyId && manager.propertyId.length > 0) {
//       try {
//         const propertyResponse = await axios.get(
//           `${process.env.PROPERTY_SERVICE_URL}/property/${manager.propertyId[0]}`
//         );
//         if (propertyResponse.data) {
//           managerObject.property = {
//             _id: propertyResponse.data._id,
//             name: propertyResponse.data.propertyName,
//           };
//         }
//       } catch (axiosError) {
//         console.error(
//           `Failed to fetch property details for ID ${manager.propertyId[0]}:`,
//           axiosError.message
//         );
//         managerObject.property = { name: "Could not fetch property details" };
//       }
//     }
//     return {
//       success: true,
//       status: 200,
//       message: "Manager retrieved successfully.",
//       data: managerObject,
//     };
//   } catch (error) {
//     console.error("Error during manager retrieval:", error);
//     return { success: false, status: 500, message: "Internal Server Error" };
//   }
// };

export const editManager = async (req, res) => {
  try {
    const updates = req.body;
    const files = req.files;
    const id = req.params.id;

    const manager = await sendRPCRequest(CLIENT_PATTERN.MANAGER.EDIT_MANAGER, {
      id,
      updates,
      files,
    });

    if (manager.status === 200) {
      res.status(200).json(manager);
    } else {
      res.status(manager.status).json(manager);
    }
  } catch (error) {
    console.error("Error during manager update:", error);
    res
      .status(500)
      .json({ success: false, status: 500, message: "Internal Server Error" });
  }
};

export const deleteManager = async (req, res) => {
  try {
    const id = req.params.id;

    const manager = await sendRPCRequest(
      CLIENT_PATTERN.MANAGER.DELETE_MANAGER,
      {
        id,
      }
    );

    if (manager.status === 200) {
      res.status(200).json(manager);
    } else {
      res.status(manager.status).json(manager);
    }
  } catch (error) {
    console.error("Error during manager deletion:", error);
    res
      .status(500)
      .json({ success: false, status: 500, message: "Internal Server Error" });
  }
};

export const changeManagerStatus = async (data) => {
  try {
    const id = req.params.id;

    const manager = await sendRPCRequest(
      CLIENT_PATTERN.MANAGER.CHANGE_MANAGER_STATUS,
      {
        id,
      }
    );

    if (manager.status === 200) {
      res.status(200).json(manager);
    } else {
      res.status(manager.status).json(manager);
    }
  } catch (error) {
    console.error("Error during manager status update:", error);
    res
      .status(500)
      .json({ success: false, status: 500, message: "Internal Server Error" });
  }
};
