import { sendRPCRequest } from "../../../../../libs/common/rabbitMq.js";
import { INVENTORY_PATTERN } from "../../../../../libs/patterns/inventory/inventory.pattern.js";

const createWeeklyMenu = async (req, res) => {
  const menuData = req.body;

  const menu = await sendRPCRequest(
    INVENTORY_PATTERN.MENU.CREATE_WEEKLY_MENU,
    menuData
  );

  if (menu.status === 201) {
    return res.status(201).json(menu);
  } else {
    return res.status(menu.status).json(menu);
  }
};

const getWeeklyMenu = async (req, res) => {
  const { kitchenId } = req.query;
  const response = await sendRPCRequest(
    INVENTORY_PATTERN.MENU.GET_WEEKLY_MENU,
    {
      kitchenId,
    }
  );
  if (response.status === 200) {
    return res.status(200).json(response);
  } else {
    return res.status(response.status || 500).json(response);
  }
};

const getTodaysMenu = async (req, res) => {
  const { day } = req.params;
  const { kitchenId } = req.query;
  const response = await sendRPCRequest(
    INVENTORY_PATTERN.MENU.GET_TODAYS_MENU,
    {
      day,
      kitchenId,
    }
  );
  if (response.status === 200) {
    return res.status(200).json(response);
  } else {
    return res.status(response.status || 500).json(response);
  }
};

const fetchAllPropertiesBookingTimes = async (req, res) => {
  const response = await sendRPCRequest(
    INVENTORY_PATTERN.MENU.FETCH_ALL_BOOKING_TIMES,
    {}
  );
  if (response.status === 200) {
    return res.status(200).json(response);
  } else {
    return res.status(response.status || 500).json(response);
  }
};

const updateWeeklyMenu = async (req, res) => {
  const updatedMenuData = req.body;
  const response = await sendRPCRequest(
    INVENTORY_PATTERN.MENU.UPDATE_WEEKLY_MENU,
    updatedMenuData
  );
  if (response.status === 200) {
    return res.status(200).json(response);
  } else {
    return res.status(response.status || 500).json(response);
  }
};

const deleteWeeklyMenu = async (req, res) => {
  const { kitchenId } = req.query;
  const response = await sendRPCRequest(
    INVENTORY_PATTERN.MENU.DELETE_WEEKLY_MENU,
    {
      kitchenId,
    }
  );
  if (response.status === 200) {
    return res.status(200).json(response);
  } else {
    return res.status(response.status || 500).json(response);
  }
};

const getMessMenuByPropertyId = async (req, res) => {
  const userId = req.userAuth;
  const { date } = req.query;
  const response = await sendRPCRequest(
    INVENTORY_PATTERN.MENU.GET_MENU_BY_PROPERTY,
    {
      userId,
      date,
    }
  );
  if (response.status === 200) {
    return res.status(200).json(response);
  } else {
    return res.status(response.status || 500).json(response);
  }
};

export {
  createWeeklyMenu,
  getWeeklyMenu,
  getTodaysMenu,
  updateWeeklyMenu,
  deleteWeeklyMenu,
  fetchAllPropertiesBookingTimes,
  getMessMenuByPropertyId,
};
