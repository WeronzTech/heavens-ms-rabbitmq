import Agency from "../models/agency.model.js";

export const getAllAgenciesWithSearch = async (data) => {
  try {
    const { search } = data;
    const query = {};

    if (search) {
      query.agencyName = { $regex: search, $options: "i" };
    }

    const agencies = await Agency.find(query).sort({ agencyName: 1 });

    return {
      success: true,
      status: 200,
      message: "Agencies retrieved successfully.",
      data: agencies,
    };
  } catch (error) {
    console.error("Get All Agencies Service Error:", error);
    return {
      success: false,
      status: 500,
      message: "Internal Server Error",
      error: error.message,
    };
  }
};

export const addAgency = async (data) => {
  try {
    const { agencyName } = data;

    const existingAgency = await Agency.findOne({ agencyName });
    if (existingAgency) {
      return {
        success: false,
        status: 409,
        message: `Agency with name '${agencyName}' already exists.`,
      };
    }

    const newAgency = await Agency.create(data);

    return {
      success: true,
      status: 201,
      message: "Agency created successfully.",
      data: newAgency,
    };
  } catch (error) {
    console.error("Add Agency Service Error:", error);
    return {
      success: false,
      status: 500,
      message: "Internal Server Error",
      error: error.message,
    };
  }
};

export const editAgency = async (data) => {
  try {
    const { agencyId, ...updateData } = data;

    const updatedAgency = await Agency.findByIdAndUpdate(agencyId, updateData, {
      new: true,
      runValidators: true,
    });

    if (!updatedAgency) {
      return {
        success: false,
        status: 404,
        message: "Agency not found.",
      };
    }

    return {
      success: true,
      status: 200,
      message: "Agency updated successfully.",
      data: updatedAgency,
    };
  } catch (error) {
    console.error("Edit Agency Service Error:", error);
    if (error.code === 11000) {
      return {
        success: false,
        status: 409,
        message: "Agency name already in use.",
      };
    }
    return {
      success: false,
      status: 500,
      message: "Internal Server Error",
      error: error.message,
    };
  }
};

export const deleteAgency = async (data) => {
  try {
    const { agencyId } = data;

    const deletedAgency = await Agency.findByIdAndDelete(agencyId);

    if (!deletedAgency) {
      return {
        success: false,
        status: 404,
        message: "Agency not found.",
      };
    }

    return {
      success: true,
      status: 200,
      message: "Agency deleted successfully.",
    };
  } catch (error) {
    console.error("Delete Agency Service Error:", error);
    return {
      success: false,
      status: 500,
      message: "Internal Server Error",
      error: error.message,
    };
  }
};

export const getAgencyById = async (data) => {
  try {
    const { agencyId } = data;

    const agency = await Agency.findById(agencyId);

    if (!agency) {
      return {
        success: false,
        status: 404,
        message: "Agency not found.",
      };
    }

    return {
      success: true,
      status: 200,
      message: "Agency retrieved successfully.",
      data: agency,
    };
  } catch (error) {
    console.error("Get Agency By ID Service Error:", error);
    return {
      success: false,
      status: 500,
      message: "Internal Server Error",
      error: error.message,
    };
  }
};
