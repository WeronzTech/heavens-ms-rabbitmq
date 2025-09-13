import { sendRPCRequest } from "../../../../../libs/common/rabbitMq.js";
import { PROPERTY_PATTERN } from "../../../../../libs/patterns/property/property.pattern.js";


export const addRoom = async (req, res) => {
    const {
        roomNo,
        roomCapacity,
        status,
        propertyId,
        propertyName,
        isHeavens,
        sharingType,
        description,
        adminName,} = req.body;
    // console.log("create");
    const response = await sendRPCRequest(PROPERTY_PATTERN.ROOM.CREATE_ROOM, {
        roomNo,
        roomCapacity,
        status,
        propertyId,
        propertyName,
        isHeavens,
        sharingType,
        description,
        adminName,
    });
    console.log(response)
  
    if (response.status === 200) {
      return res.status(200).json(response?.data);
    } else {
      return res.status(response?.status).json({ message: response.message });
    }
  };
