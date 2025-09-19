import { createResponder } from "../../../../libs/common/rabbitMq.js";
import { INVENTORY_PATTERN } from "../../../../libs/patterns/inventory/inventory.pattern.js";
import {
  createAddon,
  getAllAddons,
  getAddonById,
  updateAddon,
  updateAddonAvailability,
  deleteAddon,
  // getAddonByPropertyId,
} from "../services/addon.service.js";

createResponder(INVENTORY_PATTERN.ADDON.CREATE, async (data) => {
  return await createAddon(data);
});

createResponder(INVENTORY_PATTERN.ADDON.GET_ALL, async (data) => {
  return await getAllAddons(data);
});

createResponder(INVENTORY_PATTERN.ADDON.GET_BY_ID, async (data) => {
  return await getAddonById(data);
});

createResponder(INVENTORY_PATTERN.ADDON.UPDATE, async (data) => {
  return await updateAddon(data);
});

createResponder(INVENTORY_PATTERN.ADDON.UPDATE_AVAILABILITY, async (data) => {
  return await updateAddonAvailability(data);
});

createResponder(INVENTORY_PATTERN.ADDON.DELETE, async (data) => {
  return await deleteAddon(data);
});

// createResponder(INVENTORY_PATTERN.ADDON.GET_BY_PROPERTY, async (data) => {
//   return await getAddonByPropertyId(data);
// });
