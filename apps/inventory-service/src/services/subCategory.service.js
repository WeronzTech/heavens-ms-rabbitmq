import Category from "../models/category.model.js";
import SubCategory from "../models/subCategory.model.js";


const escapeRegex = (text) =>
  text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const addSubCategory = async (data) => {
    try {
        const { name, propertyId, categoryId } = data;
        const normalizedName = name.trim();
        console.log(data)

        if (!name || !propertyId || !categoryId) {
            return {
                success: false,
                status: 400,
                message: "Name, Property and Category are required.",
            };
        }

        const category = await Category.findOne({
            _id: categoryId,
            propertyId,
        });

        if (!category) {
            return {
                success: false,
                status: 404,
                message: "Category not found.",
            };
        }

        const exists = await SubCategory.findOne({
            propertyId,
            categoryId,
            name: {
                $regex: new RegExp(`^${escapeRegex(normalizedName)}$`, "i"),
            },
        });

        if (exists) {
            return {
                success: false,
                status: 409,
                message: "Sub category already exists.",
            };
        }

        const subCategory = await SubCategory.create({
            name,
            propertyId,
            categoryId,
        });

        return {
            success: true,
            status: 201,
            message: "Sub category created successfully.",
            data: subCategory,
        };
    } catch (error) {
        console.log(error);

        return {
            success: false,
            status: 500,
            message: "Server Error",
        };
    }
};

// export const getSubCategories = async (data) => {
//   try {
//     const { propertyId, categoryId } = data;

//     const filter = {};

//     // Always filter by selected category
//     if (categoryId) {
//       filter.categoryId = categoryId;
//     }

//     // Only filter by property when one is selected
//     if (propertyId) {
//       filter.propertyId = propertyId;
//     }

//     const subCategories = await SubCategory.find(filter)
//       .populate("categoryId", "name")
//       .sort({ name: 1 });

//     return {
//       success: true,
//       status: 200,
//       data: subCategories,
//     };
//   } catch (error) {
//     console.log(error);

//     return {
//       success: false,
//       status: 500,
//       message: "Server Error",
//     };
//   }
// };
export const getSubCategories = async (data) => {
  try {
    const { propertyId, categoryId } = data;

    console.log("Incoming:", data);

    const filter = {};

    if (categoryId) {
      filter.categoryId = categoryId;
    }

    if (propertyId) {
      filter.propertyId = propertyId;
    }

    console.log("Filter:", filter);

    const subCategories = await SubCategory.find(filter)
      .populate("categoryId", "name")
      .sort({ name: 1 });

    return {
      success: true,
      status: 200,
      data: subCategories,
    };
  } catch (error) {
    console.log(error);

    return {
      success: false,
      status: 500,
      message: "Server Error",
    };
  }
};