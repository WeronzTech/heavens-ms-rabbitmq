import { createResponder } from "../../../../libs/common/rabbitMq.js";
import { CLIENT_PATTERN } from "../../../../libs/patterns/client/client.pattern.js";
import {
  addAgency,
  deleteAgency,
  editAgency,
  getAgencyById,
  getAllAgenciesWithSearch,
} from "../service/agency.service.js";

createResponder(CLIENT_PATTERN.AGENCY.GET_AGENCIES, async (data) => {
  return await getAllAgenciesWithSearch(data);
});

createResponder(CLIENT_PATTERN.AGENCY.ADD_AGENCY, async (data) => {
  return await addAgency(data);
});

createResponder(CLIENT_PATTERN.AGENCY.EDIT_AGENCY, async (data) => {
  return await editAgency(data);
});

createResponder(CLIENT_PATTERN.AGENCY.DELETE_AGENCY, async (data) => {
  return await deleteAgency(data);
});

createResponder(CLIENT_PATTERN.AGENCY.GET_AGENCY_BY_ID, async (data) => {
  return await getAgencyById(data);
});
