import { createResponder } from "../../../../libs/common/rabbitMq.js";
import { PROPERTY_PATTERN } from "../../../../libs/patterns/property/property.pattern.js";
import {
  addWebsitePropertyContent,
  getAllWebsitePropertyContents,
  getWebsitePropertyContentById,
  updateWebsitePropertyContent,
} from "../services/website.service.js";

createResponder(
  PROPERTY_PATTERN.WEBSITE_CONTENT.ADD_PROPERTY_CONTENT,
  async (data) => {
    return await addWebsitePropertyContent(data);
  }
);

createResponder(
  PROPERTY_PATTERN.WEBSITE_CONTENT.GET_ALL_PROPERTY_CONTENT,
  async (data) => {
    return await getAllWebsitePropertyContents(data);
  }
);

createResponder(
  PROPERTY_PATTERN.WEBSITE_CONTENT.UPDATE_PROPERTY_CONTENT,
  async (data) => {
    return await updateWebsitePropertyContent(data);
  }
);

createResponder(
  PROPERTY_PATTERN.WEBSITE_CONTENT.PROPERTY_CONTENT_BY_ID,
  async (data) => {
    return await getWebsitePropertyContentById(data);
  }
);
