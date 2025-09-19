
// import { getAllStaff } from "../services/staff.service.js";
import { PROPERTY_PATTERN } from "../../../../libs/patterns/property/property.pattern.js";
import { createResponder } from "../../../../libs/common/rabbitMq.js";
import {
  addStaff,
  deleteStaff,
  getAllStaff,
  getStaffById,
  getStaffByPropertyId,
  staffStatusChange,
  updateStaff,
} from "../services/staff.service.js";


createResponder(PROPERTY_PATTERN.STAFF.GET_ALL_STAFF, async (data) => {
  return await getAllStaff(data);
});

createResponder(PROPERTY_PATTERN.STAFF.GET_STAFF_BY_ID, async (data) => {
  return await getStaffById(data);
});

createResponder(PROPERTY_PATTERN.STAFF.DELETE_STAFF, async (data) => {
  return await deleteStaff(data);
});

createResponder(PROPERTY_PATTERN.STAFF.STAFF_STATUS_CHANGE, async (data) => {
  return await staffStatusChange(data);
});

createResponder(
  PROPERTY_PATTERN.STAFF.GET_STAFF_BY_PROPERTYID,async (data) => {
    return await getStaffByPropertyId(data);
  });

createResponder(
  PROPERTY_PATTERN.STAFF.ADD_STAFF,async (data) => {
    return await addStaff(data);
  });

createResponder(
  PROPERTY_PATTERN.STAFF.UPDATE_STAFF,async (data) => {
    return await updateStaff(data);
  });




