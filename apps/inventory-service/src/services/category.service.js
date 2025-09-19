import Category from "../models/category.model.js";
import RecipeCategory from "../models/recipeCategory.model.js";

export const addCategory = async (data) => {
  try {
    const { name, propertyId } = data;

    if (!name || !propertyId) {
      return {
        success: false,
        status: 400,
        message: "Category name and propertyId are required.",
      };
    }

    const category = new Category({ name, propertyId });
    await category.save();

    return {
      success: true,
      status: 201,
      message: "Category created successfully",
      data: category,
    };
  } catch (error) {
    console.error("Error adding category:", error);
    return {
      success: false,
      status: 500,
      message: "Server error while creating category",
    };
  }
};

export const getCategoriesByPropertyId = async (data) => {
  try {
    const { propertyId } = data;
    const filter = {};
    if (propertyId) {
      filter.propertyId = propertyId;
    }

    const categories = await Category.find(filter).sort({ name: 1 });

    return {
      success: true,
      status: 200,
      message: "Categories fetched successfully",
      data: categories,
    };
  } catch (error) {
    console.error("Error fetching categories:", error);
    return {
      success: false,
      status: 500,
      message: "Error fetching categories",
    };
  }
};

export const createRecipeCategory = async (data) => {
  try {
    const { name, kitchenId } = data;
    if (!kitchenId) {
      return {
        success: false,
        status: 400,
        message: "Kitchen ID is required",
      };
    }

    const categoryExists = await RecipeCategory.findOne({ name, kitchenId });
    if (categoryExists) {
      return {
        success: false,
        status: 409,
        message:
          "Recipe category with this name already exists in this kitchen",
      };
    }

    const recipeCategory = new RecipeCategory({ name, kitchenId });
    const createdCategory = await recipeCategory.save();

    return {
      success: true,
      status: 201,
      message: "Recipe category created successfully.",
      data: createdCategory,
    };
  } catch (error) {
    return { success: false, status: 500, message: "Server Error" };
  }
};

export const getRecipeCategoriesByKitchen = async (data) => {
  try {
    const { kitchenId } = data;
    const categories = await RecipeCategory.find({ kitchenId }).populate(
      "recipes"
    );
    return {
      success: true,
      status: 200,
      message: "Recipe categories retrieved successfully.",
      data: categories,
    };
  } catch (error) {
    return { success: false, status: 500, message: "Server Error" };
  }
};

export const getRecipeCategoryById = async (data) => {
  try {
    const { id } = data;
    const category = await RecipeCategory.findById(id).populate("recipes");
    if (category) {
      return {
        success: true,
        status: 200,
        message: "Recipe category found.",
        data: category,
      };
    } else {
      return {
        success: false,
        status: 404,
        message: "Recipe category not found",
      };
    }
  } catch (error) {
    return { success: false, status: 500, message: "Server Error" };
  }
};

export const updateRecipeCategory = async (data) => {
  try {
    const { id, name } = data;
    const category = await RecipeCategory.findById(id);

    if (category) {
      if (name && name !== category.name) {
        const existingCategory = await RecipeCategory.findOne({
          name,
          kitchenId: category.kitchenId,
        });
        if (existingCategory) {
          return {
            success: false,
            status: 409,
            message:
              "Another category with this name already exists in this kitchen.",
          };
        }
      }

      category.name = name || category.name;
      const updatedCategory = await category.save();
      return {
        success: true,
        status: 200,
        message: "Recipe category updated.",
        data: updatedCategory,
      };
    } else {
      return {
        success: false,
        status: 404,
        message: "Recipe category not found",
      };
    }
  } catch (error) {
    return { success: false, status: 500, message: "Server Error" };
  }
};

export const deleteRecipeCategory = async (data) => {
  try {
    const { id } = data;
    const category = await RecipeCategory.findById(id);

    if (category) {
      await RecipeCategory.deleteOne({ _id: id });
      return {
        success: true,
        status: 200,
        message: "Recipe category removed",
      };
    } else {
      return {
        success: false,
        status: 404,
        message: "Recipe category not found",
      };
    }
  } catch (error) {
    return { success: false, status: 500, message: "Server Error" };
  }
};
