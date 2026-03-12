import { Maintenance } from "../models/maintenance.model.js";
import propertyModel from "../models/property.model.js";
import { sendRPCRequest } from "../../../../libs/common/rabbitMq.js";
import { NOTIFICATION_PATTERN } from "../../../../libs/patterns/notification/notification.pattern.js";
import { CLIENT_PATTERN } from "../../../../libs/patterns/client/client.pattern.js";

const sendNotification = async (userId, title, description) => {
  try {
    const response = await sendRPCRequest(
      NOTIFICATION_PATTERN.NOTIFICATION.SEND_NOTIFICATION,
      { data: { title, description, userId } }, // ✅ wrapped in data
    );

    if (response.status === 201) {
      console.log(`Notification sent successfully to user ${userId}`);
    }
  } catch (error) {
    console.error(
      `Failed to send notification to user ${userId}:`,
      error.message,
    );
  }
};

export const checkUnassignedMaintenance = async () => {
  console.log(
    "Running cron job: Checking for unassigned maintenance issues...",
  );
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  try {
    const unassignedRequests = await Maintenance.find({
      assignedStaffId: { $exists: false },
      createdAt: { $lte: oneHourAgo },
    });

    if (unassignedRequests.length === 0) {
      console.log(
        "No unassigned maintenance issues found that require escalation.",
      );
      return;
    }

    console.log(
      `Found ${unassignedRequests.length} unassigned issue(s). Processing...`,
    );

    for (const request of unassignedRequests) {
      try {
        const propertyResponse = await propertyModel.findById(
          request.propertyId,
        );
        const clientId = propertyResponse?.clientId;

        if (!clientId) {
          console.error(
            `Could not find clientId for propertyId: ${request.propertyId}`,
          );
          continue;
        }

        const managerResponse = await sendRPCRequest(
          CLIENT_PATTERN.MANAGER.GET_ALL_MANAGERS,
          { propertyId: request.propertyId },
        );
        const manager = managerResponse.data?.data;

        const title = "Unassigned Maintenance Alert";
        const description = `The maintenance request for room "${request.roomNo}" regarding "${request.issue}" has not been assigned for over an hour.`;

        await sendNotification(clientId, title, description);

        for (const m of manager) {
          if (m && m._id) {
            await sendNotification(m._id, title, description);
          } else {
            console.log(
              `No manager found for propertyId: ${request.propertyId}`,
            );
          }
        }
      } catch (error) {
        console.error(
          `Error processing maintenance request ${request._id}:`,
          error.message,
        );
      }
    }
  } catch (error) {
    console.error(
      "A critical error occurred in the maintenance cron job:",
      error.message,
    );
  }
};

export const checkPropertyRentDue = async () => {
  console.log("Running cron job: Checking for Property Rent Dues...");
  const today = new Date();
  const currentDay = today.getDate();

  // Logic to handle end of month (e.g. if today is Feb 28, process 29, 30, 31)
  const isLastDayOfMonth =
    new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate() ===
    currentDay;

  console.log("currentDay", currentDay, "isLastDayOfMonth", isLastDayOfMonth);

  try {
    const query = {
      "rentDetails.isRentEnabled": true,
      // Check if last update was NOT this month (to avoid double charging if script runs twice)
      $or: [
        { "rentDetails.lastAutoUpdateDate": { $exists: false } },
        {
          "rentDetails.lastAutoUpdateDate": {
            $lt: new Date(today.getFullYear(), today.getMonth(), 1),
          },
        },
      ],
    };

    if (isLastDayOfMonth) {
      // If last day of month, get all properties with due date >= today
      query["rentDetails.dueDate"] = { $gte: currentDay };
    } else {
      // Otherwise, match exact day
      query["rentDetails.dueDate"] = currentDay;
    }
    console.log("Querying properties with:", query);

    const propertiesDue = await propertyModel.find(query);

    if (propertiesDue.length === 0) {
      console.log("No properties found with rent due today.");
      return;
    }

    console.log(
      `Found ${propertiesDue.length} properties with rent due. Updating balances...`,
    );

    for (const property of propertiesDue) {
      // Increase balance
      property.rentDetails.pendingBalance =
        (property.rentDetails.pendingBalance || 0) +
        property.rentDetails.rentAmount;
      property.rentDetails.lastAutoUpdateDate = today;
      await property.save();

      // Optional: Send Notification to Client
      if (property.clientId) {
        await sendNotification(
          property.clientId,
          "Property Rent Due",
          `Rent of ₹${property.rentDetails.rentAmount} for ${property.propertyName} has been added to your pending balance.`,
        );
      }
    }
    console.log("Property Rent updates completed.");
  } catch (error) {
    console.error("Critical error in Property Rent cron job:", error.message);
  }
};
