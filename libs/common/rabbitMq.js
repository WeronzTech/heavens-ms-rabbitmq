// import amqp from "amqplib";
// import { v4 as uuidv4 } from "uuid";
// import dotenv from "dotenv";

// dotenv.config();

// const RABBITMQ_URL = process.env.RABBITMQ_URL;

// // ✅ CHANGED: Only the connection and a dedicated listener channel are global.
// let connection;
// let listenerChannel;
// const MAX_INITIAL_ATTEMPTS = 10;
// let initialConnectionAttempts = 0;

// async function connect() {
//   try {
//     connection = await amqp.connect(RABBITMQ_URL);
//     console.log("Connected to RabbitMQ");
//     initialConnectionAttempts = 0;

//     connection.on("error", (err) => {
//       console.error("[RabbitMQ] connection error", err);
//     });

//     connection.on("close", () => {
//       console.warn("[RabbitMQ] connection closed. Reconnecting...");
//       listenerChannel = null;
//       connection = null;
//       setTimeout(connect, 5000);
//     });

//     // ✨ This is now the dedicated channel for all consumers/responders.
//     listenerChannel = await connection.createChannel();
//     await listenerChannel.prefetch(1);

//     listenerChannel.on("error", (err) => {
//       console.error("[RabbitMQ] listener channel error", err);
//     });
//     listenerChannel.on("close", () => {
//       console.warn("[RabbitMQ] listener channel closed");
//     });
//   } catch (error) {
//     console.error("Failed to connect to RabbitMQ, retrying...", error);
//     initialConnectionAttempts++;
//     if (initialConnectionAttempts >= MAX_INITIAL_ATTEMPTS) {
//       console.error(
//         `🔥🔥🔥 [RabbitMQ] Gave up after ${MAX_INITIAL_ATTEMPTS} attempts. Please check the RabbitMQ server or connection URL.`
//       );
//       return; // Stop retrying
//     }
//     setTimeout(connect, 5000);
//   }
// }

// async function createResponder(queueName, handler) {
//   // Use the dedicated, long-lived listener channel.
//   if (!listenerChannel) await connect();
//   await listenerChannel.assertQueue(queueName, { durable: false });

//   console.log(`[Responder] Listening for requests on '${queueName}'`);

//   listenerChannel.consume(queueName, async (msg) => {
//     if (!msg) {
//       console.warn(`[${queueName}] Consumer received a null message.`);
//       return;
//     }

//     const correlationId = msg.properties.correlationId;
//     console.log(
//       `[${queueName}] Received message with correlationId: ${correlationId}`
//     );

//     if (!msg.properties.replyTo || !correlationId) {
//       console.warn(
//         `[${queueName}] Invalid message, rejecting. correlationId: ${correlationId}`
//       );
//       return listenerChannel.nack(msg, false, false);
//     }

//     try {
//       const requestData = JSON.parse(msg.content.toString());
//       const response = await handler(requestData);

//       // Still use the listenerChannel to send the reply back.
//       listenerChannel.sendToQueue(
//         msg.properties.replyTo,
//         Buffer.from(JSON.stringify(response)),
//         { correlationId: correlationId }
//       );

//       console.log(
//         `[${queueName}] Successfully processed and ack'ing message: ${correlationId}`
//       );
//       listenerChannel.ack(msg);
//     } catch (error) {
//       console.error(
//         `[${queueName}] Error processing message ${correlationId}:`,
//         error
//       );
//       const errorResponse = {
//         success: false,
//         status: 500,
//         message:
//           error.message || "An internal server error occurred in the service.",
//       };
//       listenerChannel.sendToQueue(
//         msg.properties.replyTo,
//         Buffer.from(JSON.stringify(errorResponse)),
//         { correlationId: correlationId }
//       );
//       console.error(`[${queueName}] Nack'ing failed message: ${correlationId}`);
//       listenerChannel.nack(msg, false, false);
//     }
//   });
// }

// // ✅ REBUILT: This function is now fully self-contained and robust.
// async function sendRPCRequest(queueName, data) {
//   if (!connection) await connect();

//   let rpcChannel;
//   try {
//     // 1. Create a brand new channel for this single request.
//     rpcChannel = await connection.createChannel();

//     const correlationId = uuidv4();
//     // 2. Create the temporary reply queue on the new channel.
//     const replyQueue = await rpcChannel.assertQueue("", { exclusive: true });

//     const replyPromise = new Promise((resolve, reject) => {
//       const timeout = setTimeout(() => {
//         reject(new Error(`RPC request to queue '${queueName}' timed out`));
//       }, 15000);

//       // 3. Listen for the reply on the new channel.
//       rpcChannel.consume(
//         replyQueue.queue,
//         (msg) => {
//           if (msg?.properties?.correlationId === correlationId) {
//             clearTimeout(timeout);
//             resolve(JSON.parse(msg.content.toString()));
//           }
//         },
//         { noAck: true }
//       );
//     });

//     // 4. Send the request on the new channel.
//     rpcChannel.sendToQueue(queueName, Buffer.from(JSON.stringify(data)), {
//       correlationId,
//       replyTo: replyQueue.queue,
//     });

//     return await replyPromise;
//   } catch (error) {
//     console.error(`[RPC Error] Failed to send request to ${queueName}:`, error);
//     throw error; // Re-throw the error to the original caller.
//   } finally {
//     // 5. CRITICAL: Always close the temporary channel.
//     if (rpcChannel) {
//       await rpcChannel.close();
//     }
//   }
// }

// // ✅ REBUILT: Now uses the "temporary channel" pattern for robustness.
// async function publishToQueue(queueName, data) {
//   if (!connection) await connect();

//   let pubChannel;
//   try {
//     pubChannel = await connection.createChannel();
//     await pubChannel.assertQueue(queueName);
//     pubChannel.sendToQueue(queueName, Buffer.from(data));
//     console.log(`Message sent to ${queueName}`);
//   } catch (error) {
//     console.error(`Failed to publish to queue ${queueName}`, error);
//   } finally {
//     if (pubChannel) {
//       await pubChannel.close();
//     }
//   }
// }

// export { connect, createResponder, sendRPCRequest, publishToQueue };
import amqp from "amqplib";
import { v4 as uuidv4 } from "uuid";
import dotenv from "dotenv";

dotenv.config();

const RABBITMQ_URL = process.env.RABBITMQ_URL;

let connection;
let listenerChannel; // For processing incoming requests (Responder)
// ✅ NEW: Dedicated components for sending requests
let publisherChannel;
let replyQueue;
const pendingRequests = new Map(); // Stores the promises for active RPC calls

const MAX_INITIAL_ATTEMPTS = 10;
let initialConnectionAttempts = 0;

async function connect() {
  try {
    connection = await amqp.connect(RABBITMQ_URL);
    console.log("Connected to RabbitMQ");
    initialConnectionAttempts = 0;

    connection.on("error", (err) => {
      console.error("[RabbitMQ] connection error", err);
    });

    connection.on("close", () => {
      console.warn("[RabbitMQ] connection closed. Reconnecting...");
      listenerChannel = null;
      publisherChannel = null;
      replyQueue = null;
      connection = null;
      setTimeout(connect, 5000);
    });

    // ------------------------------------------------------------
    // 1. Setup Listener Channel (For createResponder)
    // ------------------------------------------------------------
    listenerChannel = await connection.createChannel();
    await listenerChannel.prefetch(1);

    listenerChannel.on("error", (err) => {
      console.error("[RabbitMQ] listener channel error", err);
    });

    // ------------------------------------------------------------
    // 2. Setup Publisher Channel (For sendRPCRequest & publishToQueue)
    // ✅ CHANGED: We now set up a single reply queue for ALL outgoing requests here.
    // ------------------------------------------------------------
    publisherChannel = await connection.createChannel();

    // Create one exclusive queue for this service to receive replies
    const q = await publisherChannel.assertQueue("", { exclusive: true });
    replyQueue = q.queue;

    // Start consuming from this reply queue immediately
    publisherChannel.consume(
      replyQueue,
      (msg) => {
        if (!msg) return;
        const correlationId = msg.properties.correlationId;

        // Find the pending request matching this ID
        const request = pendingRequests.get(correlationId);

        if (request) {
          // Resolve the promise associated with this ID
          request.resolve(JSON.parse(msg.content.toString()));
          clearTimeout(request.timeout);
          pendingRequests.delete(correlationId);
        }
      },
      { noAck: true },
    );

    publisherChannel.on("error", (err) => {
      console.error("[RabbitMQ] publisher channel error", err);
    });
  } catch (error) {
    console.error("Failed to connect to RabbitMQ, retrying...", error);
    initialConnectionAttempts++;
    if (initialConnectionAttempts >= MAX_INITIAL_ATTEMPTS) {
      console.error(
        `🔥🔥🔥 [RabbitMQ] Gave up after ${MAX_INITIAL_ATTEMPTS} attempts.`,
      );
      return;
    }
    setTimeout(connect, 5000);
  }
}

async function createResponder(queueName, handler) {
  if (!listenerChannel) await connect();
  await listenerChannel.assertQueue(queueName, { durable: false });

  console.log(`[Responder] Listening for requests on '${queueName}'`);

  listenerChannel.consume(queueName, async (msg) => {
    if (!msg) return;

    const correlationId = msg.properties.correlationId;
    const replyTo = msg.properties.replyTo;

    if (!replyTo || !correlationId) {
      console.warn(
        `[${queueName}] Invalid message missing replyTo/correlationId`,
      );
      return listenerChannel.nack(msg, false, false);
    }

    try {
      const requestData = JSON.parse(msg.content.toString());
      const response = await handler(requestData);

      listenerChannel.sendToQueue(
        replyTo,
        Buffer.from(JSON.stringify(response)),
        { correlationId },
      );

      listenerChannel.ack(msg);
    } catch (error) {
      console.error(`[${queueName}] Error processing message:`, error);

      const errorResponse = {
        success: false,
        status: 500,
        message: error.message || "Internal server error",
      };

      listenerChannel.sendToQueue(
        replyTo,
        Buffer.from(JSON.stringify(errorResponse)),
        { correlationId },
      );

      listenerChannel.ack(msg); // Ack even on error so message doesn't get stuck
    }
  });
}

// ✅ CHANGED: Highly optimized version.
// Reuses the single channel and reply queue created in connect().
async function sendRPCRequest(queueName, data) {
  if (!connection || !publisherChannel || !replyQueue) await connect();

  const correlationId = uuidv4();

  return new Promise((resolve, reject) => {
    // 1. Create a timeout to clean up if no response comes
    const timeout = setTimeout(() => {
      if (pendingRequests.has(correlationId)) {
        pendingRequests.delete(correlationId);
        reject(new Error(`RPC request to queue '${queueName}' timed out`));
      }
    }, 20000); // Increased timeout to 20s for safety

    // 2. Store the resolve/reject functions in the Map
    pendingRequests.set(correlationId, { resolve, reject, timeout });

    // 3. Send the message using the shared channel
    try {
      publisherChannel.sendToQueue(
        queueName,
        Buffer.from(JSON.stringify(data)),
        {
          correlationId,
          replyTo: replyQueue, // Reply to our single shared queue
        },
      );
    } catch (err) {
      pendingRequests.delete(correlationId);
      clearTimeout(timeout);
      reject(err);
    }
  });
}

// ✅ CHANGED: Uses the persistent publisher channel instead of creating a new one.
async function publishToQueue(queueName, data) {
  if (!connection || !publisherChannel) await connect();

  try {
    await publisherChannel.assertQueue(queueName);
    publisherChannel.sendToQueue(queueName, Buffer.from(data));
    console.log(`Message sent to ${queueName}`);
  } catch (error) {
    console.error(`Failed to publish to queue ${queueName}`, error);
  }
}

export { connect, createResponder, sendRPCRequest, publishToQueue };
