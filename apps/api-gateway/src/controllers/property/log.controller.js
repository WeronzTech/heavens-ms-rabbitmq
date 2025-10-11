import { sendRPCRequest } from "../../../../../libs/common/rabbitMq.js";
import { PROPERTY_PATTERN } from "../../../../../libs/patterns/property/property.pattern.js";

export const getActivityLogsController = async (req, res) => {
  const {
    propertyId,
    category,
    page = 1,
    limit = 10,
    startDate,
    endDate,
  } = req.query;
  //
  const response = await sendRPCRequest(
    PROPERTY_PATTERN.PROPERTY_LOG.GET_ACTIVITY_LOG,
    {
      propertyId,
      category,
      page,
      limit,
      startDate,
      endDate,
    }
  );

  if (response.status === 200) {
    return res.status(200).json(response?.data);
  } else {
    return res.status(response?.status).json({ message: response.message });
  }
};
