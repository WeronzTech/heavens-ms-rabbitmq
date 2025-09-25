// import amqp from "amqplib";
// import { v4 as uuidv4 } from "uuid";
// const RABBITMQ_URL = "amqp://admin:admin123@localhost:5672";

// let connection, channel;

// // async function connect() {
// //   connection = await amqp.connect(RABBITMQ_URL);
// //   channel = await connection.createChannel();
// //   console.log("Connected to RabbitMQ");
// // }
// async function connect() {
//   try {
//     connection = await amqp.connect(RABBITMQ_URL);
//     console.log("Connected to RabbitMQ");

//     // ✅ GRACEFUL ERROR HANDLING FOR THE CONNECTION
//     connection.on("error", (err) => {
//       console.error("[RabbitMQ] connection error", err);
//       // Implement reconnection logic if needed
//     });
//     connection.on("close", () => {
//       console.warn("[RabbitMQ] connection closed");
//       // Implement reconnection logic if needed
//     });

//     channel = await connection.createChannel();

//     // ✅ GRACEFUL ERROR HANDLING FOR THE CHANNEL
//     channel.on("error", (err) => {
//       console.error("[RabbitMQ] channel error", err);
//     });
//     channel.on("close", () => {
//       console.warn("[RabbitMQ] channel closed");
//     });
//   } catch (error) {
//     console.error("Failed to connect to RabbitMQ", error);
//     // Exit or implement a retry mechanism if the initial connection fails
//     setTimeout(connect, 5000); // Retry connection after 5 seconds
//   }
// }

// async function subscribeToQueue(queueName, callback) {
//   if (!channel) await connect();
//   await channel.assertQueue(queueName);
//   channel.consume(queueName, (message) => {
//     callback(message.content.toString());
//     channel.ack(message);
//   });
// }

// async function publishToQueue(queueName, data) {
//   if (!channel) await connect();
//   await channel.assertQueue(queueName);
//   channel.sendToQueue(queueName, Buffer.from(data));
// }

// // async function createResponder(queueName, handler) {
// //   if (!channel) await connect();
// //   await channel.assertQueue(queueName, { durable: true });

// //   console.log(`[Responder] Listening for requests on '${queueName}'`);

// //   channel.consume(queueName, async (msg) => {
// //     if (msg?.properties?.replyTo && msg?.properties?.correlationId) {
// //       const requestData = JSON.parse(msg.content.toString());

// //       // Run the user-provided logic (e.g., fetch from database)
// //       const result = await handler(requestData);

// //       // Send the result back to the replyTo queue
// //       channel.sendToQueue(
// //         msg?.properties?.replyTo,
// //         Buffer.from(JSON.stringify(result)),
// //         { correlationId: msg?.properties?.correlationId }
// //       );

// //       // Acknowledge the original message
// //       channel.ack(msg);
// //     }
// //   });
// // }
// async function createResponder(queueName, handler) {
//   if (!channel) await connect();
//   await channel.assertQueue(queueName, { durable: true });

//   console.log(`[Responder] Listening for requests on '${queueName}'`);

//   channel.consume(queueName, async (msg) => {
//     if (msg?.properties?.replyTo && msg?.properties?.correlationId) {
//       let response;
//       try {
//         const requestData = JSON.parse(msg.content.toString());
//         response = await handler(requestData);
//       } catch (error) {
//         console.error(`[Responder Error on ${queueName}]`, error);
//         response = {
//           success: false,
//           status: 500,
//           message:
//             error.message ||
//             "An internal server error occurred in the service.",
//         };
//       } finally {
//         // ALWAYS send a response back
//         channel.sendToQueue(
//           msg.properties.replyTo,
//           Buffer.from(JSON.stringify(response)),
//           { correlationId: msg.properties.correlationId }
//         );
//         // ALWAYS acknowledge the message
//         channel.ack(msg);
//       }
//     }
//   });
// }

// async function sendRPCRequest(queueName, data) {
//   if (!channel) await connect();

//   return new Promise(async (resolve, reject) => {
//     const correlationId = uuidv4();

//     // Create a temporary, exclusive queue for the reply
//     const replyQueue = await channel.assertQueue("", { exclusive: true });

//     // Set up a consumer to listen for the specific reply
//     channel.consume(
//       replyQueue.queue,
//       (msg) => {
//         if (msg?.properties?.correlationId === correlationId) {
//           resolve(JSON.parse(msg.content.toString()));
//           channel.deleteQueue(replyQueue.queue); // Clean up the temporary queue
//         }
//       },
//       { noAck: true }
//     );

//     // Publish the request message with the 'replyTo' and 'correlationId' properties
//     channel.sendToQueue(queueName, Buffer.from(JSON.stringify(data)), {
//       correlationId,
//       replyTo: replyQueue.queue,
//     });
//   });
// }

// export {
//   subscribeToQueue,
//   publishToQueue,
//   connect,
//   createResponder,
//   sendRPCRequest,
// };
import amqp from "amqplib";
import { v4 as uuidv4 } from "uuid";
const RABBITMQ_URL = "amqp://admin:admin123@localhost:5672";

let connection, channel;

async function connect() {
  try {
    connection = await amqp.connect(RABBITMQ_URL);
    console.log("Connected to RabbitMQ");

    connection.on("error", (err) => {
      console.error("[RabbitMQ] connection error", err);
    });
    connection.on("close", () => {
      console.warn("[RabbitMQ] connection closed");
      // Consider implementing reconnection logic here
      channel = null;
      connection = null;
      setTimeout(connect, 5000);
    });

    channel = await connection.createChannel();

    channel.on("error", (err) => {
      console.error("[RabbitMQ] channel error", err);
    });
    channel.on("close", () => {
      console.warn("[RabbitMQ] channel closed");
    });
  } catch (error) {
    console.error("Failed to connect to RabbitMQ", error);
    setTimeout(connect, 5000); // Retry connection after 5 seconds
  }
}

// ✅ CORRECTED for safe acknowledgment
async function subscribeToQueue(queueName, callback) {
  if (!channel) await connect();
  await channel.assertQueue(queueName);

  channel.consume(queueName, async (message) => {
    if (message !== null) {
      try {
        await callback(message.content.toString());
        channel.ack(message);
      } catch (error) {
        console.error(
          `Error processing message from queue ${queueName}:`,
          error
        );
        channel.nack(message, false, false);
      }
    }
  });
}

async function publishToQueue(queueName, data) {
  try {
    if (!channel) await connect();
    await channel.assertQueue(queueName);
    channel.sendToQueue(queueName, Buffer.from(data));
  } catch (error) {
    console.error(`Failed to publish to queue ${queueName}`, error);
  }
}

// ✅ CORRECTED to prevent double-acking and handle errors gracefully
// async function createResponder(queueName, handler) {
//   if (!channel) await connect();
//   await channel.assertQueue(queueName, { durable: true });

//   console.log(`[Responder] Listening for requests on '${queueName}'`);

//   channel.consume(queueName, async (msg) => {
//     if (msg && msg.properties.replyTo && msg.properties.correlationId) {
//       let response;
//       try {
//         const requestData = JSON.parse(msg.content.toString());
//         response = await handler(requestData);

//         channel.sendToQueue(
//           msg.properties.replyTo,
//           Buffer.from(JSON.stringify(response)),
//           { correlationId: msg.properties.correlationId }
//         );

//         channel.ack(msg);
//       } catch (error) {
//         console.error(`[Responder Error on ${queueName}]`, error);
//         response = {
//           success: false,
//           status: 500,
//           message: error.message || "An internal server error occurred.",
//         };

//         channel.sendToQueue(
//           msg.properties.replyTo,
//           Buffer.from(JSON.stringify(response)),
//           { correlationId: msg.properties.correlationId }
//         );

//         channel.nack(msg, false, false);
//       }
//     } else {
//       console.warn("Received invalid message, rejecting.");
//       if (msg) channel.nack(msg, false, false);
//     }
//   });
// }
// ✅ CORRECTED to prevent double-acknowledgment
// async function createResponder(queueName, handler) {
//   if (!channel) await connect();
//   await channel.assertQueue(queueName, { durable: false });

//   console.log(`[Responder] Listening for requests on '${queueName}'`);

//   channel.consume(queueName, async (msg) => {
//     // If msg is null, do nothing.
//     if (!msg) {
//       console.warn("Received a null message.");
//       return;
//     }

//     // Check for invalid messages first.
//     if (!msg.properties.replyTo || !msg.properties.correlationId) {
//       console.warn("Received invalid message, rejecting.");
//       // Nack the invalid message so it doesn't get redelivered.
//       return channel.nack(msg, false, false);
//     }

//     try {
//       const requestData = JSON.parse(msg.content.toString());
//       const response = await handler(requestData);

//       // Try to send the successful response.
//       channel.sendToQueue(
//         msg.properties.replyTo,
//         Buffer.from(JSON.stringify(response)),
//         { correlationId: msg.properties.correlationId }
//       );

//       // If sending the response was successful, ACK the original message.
//       channel.ack(msg);
//     } catch (error) {
//       console.error(`[Responder Error on ${queueName}]`, error);

//       const errorResponse = {
//         success: false,
//         status: 500,
//         message: error.message || "An internal server error occurred.",
//       };

//       // Try to send an error response back. This might also fail if the channel is closing,
//       // but we attempt it before nacking.
//       channel.sendToQueue(
//         msg.properties.replyTo,
//         Buffer.from(JSON.stringify(errorResponse)),
//         { correlationId: msg.properties.correlationId }
//       );

//       // IMPORTANT: Since an error occurred, we now NACK the message.
//       // This happens only in the catch block, ensuring no double-ack.
//       channel.nack(msg, false, false);
//     }
//   });
// }
async function createResponder(queueName, handler) {
  if (!channel) await connect();

  // Defensive check for the 'undefined' queue name problem
  if (!queueName) {
    console.error(
      "[Responder Error] Attempted to listen on an undefined queue name. Aborting."
    );
    return;
  }

  await channel.assertQueue(queueName, { durable: false });

  console.log(`[Responder] Listening for requests on '${queueName}'`);

  channel.consume(queueName, async (msg) => {
    // If msg is null (e.g., queue deleted), do nothing.
    if (!msg) {
      console.warn(
        `Consumer for queue '${queueName}' received a null message.`
      );
      return;
    }

    // Check for invalid messages first.
    if (!msg.properties.replyTo || !msg.properties.correlationId) {
      console.warn(
        "Received invalid message (missing replyTo or correlationId), rejecting."
      );
      // Nack the invalid message so it's not redelivered.
      return channel.nack(msg, false, false);
    }

    try {
      const requestData = JSON.parse(msg.content.toString());
      const response = await handler(requestData);

      // Try to send the successful response.
      channel.sendToQueue(
        msg.properties.replyTo,
        Buffer.from(JSON.stringify(response)),
        { correlationId: msg.properties.correlationId }
      );

      // ✅ Guarantees message is ack'd only on full success
      channel.ack(msg);
    } catch (error) {
      console.error(`[Responder Error on ${queueName}]`, error);

      const errorResponse = {
        success: false,
        status: 500,
        message: error.message || "An internal server error occurred.",
      };

      // Try to send an error response back.
      channel.sendToQueue(
        msg.properties.replyTo,
        Buffer.from(JSON.stringify(errorResponse)),
        { correlationId: msg.properties.correlationId }
      );

      // ✅ Guarantees message is nack'd exactly once on failure
      channel.nack(msg, false, false);
    }
  });
}

async function sendRPCRequest(queueName, data) {
  if (!channel) await connect();

  return new Promise(async (resolve, reject) => {
    const correlationId = uuidv4();
    const replyQueue = await channel.assertQueue("", { exclusive: true });

    const timeout = setTimeout(() => {
      channel.deleteQueue(replyQueue.queue);
      reject(new Error("RPC request timed out"));
    }, 10000); // 10-second timeout

    channel.consume(
      replyQueue.queue,
      (msg) => {
        if (msg?.properties?.correlationId === correlationId) {
          clearTimeout(timeout);
          resolve(JSON.parse(msg.content.toString()));
          channel.deleteQueue(replyQueue.queue);
        }
      },
      { noAck: true }
    );

    channel.sendToQueue(queueName, Buffer.from(JSON.stringify(data)), {
      correlationId,
      replyTo: replyQueue.queue,
    });
  });
}

export {
  subscribeToQueue,
  publishToQueue,
  connect,
  createResponder,
  sendRPCRequest,
};
