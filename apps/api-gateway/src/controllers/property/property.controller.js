import { sendRPCRequest } from "../../../../../libs/common/rabbitMq.js";
import { PROPERTY_PATTERN } from "../../../../../libs/patterns/property/property.pattern.js";

export const createProperty = async (req, res) => {
    const {
        state,
        city,
        location,
        branch,
        phase,
        propertyName,
        sharingPrices,
        deposit,
        kitchenId,
        images,
        adminName,
        clientId,
        ...rest } = req.body;
    // console.log("create");
    const response = await sendRPCRequest(PROPERTY_PATTERN.PROPERTY.CREATE_PROPERTY, {
        state,
        city,
        location,
        branch,
        phase,
        propertyName,
        sharingPrices,
        deposit,
        kitchenId,
        images,
        adminName,
        clientId,
        ...rest
    });
  
    if (response.status === 200) {
      return res.status(200).json(response?.data);
    } else {
      return res.status(response?.status).json({ message: response.message });
    }
  };


export const updateProperty = async (req, res) => {
    const {
        state,
        city,
        location,
        branch,
        phase,
        propertyName,
        sharingPrices,
        deposit,
        kitchenId,
        images,
        adminName,
        clientId,
        ...rest } = req.body;
    console.log("update ");
    const response = await sendRPCRequest(PROPERTY_PATTERN.PROPERTY.UPDATE_PROPERTY, {
        state,
        city,
        location,
        branch,
        phase,
        propertyName,
        sharingPrices,
        deposit,
        kitchenId,
        images,
        adminName,
        clientId,
        ...rest
    });
  
    if (response.status === 200) {
      return res.status(200).json(response?.data);
    } else {
      return res.status(response?.status).json({ message: response.message });
    }
  };