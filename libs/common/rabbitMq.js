import amqp from "amqplib";
import { v4 as uuidv4 } from "uuid";
const RABBITMQ_URL = "amqp://admin:admin123@localhost:5672";

let connection, channel;

async function connect() {
  connection = await amqp.connect(RABBITMQ_URL);
  channel = await connection.createChannel();
  console.log("Connected to RabbitMQ");
}

async function subscribeToQueue(queueName, callback) {
  if (!channel) await connect();
  await channel.assertQueue(queueName);
  channel.consume(queueName, (message) => {
    callback(message.content.toString());
    channel.ack(message);
  });
}

async function publishToQueue(queueName, data) {
  if (!channel) await connect();
  await channel.assertQueue(queueName);
  channel.sendToQueue(queueName, Buffer.from(data));
}

async function createResponder(queueName, handler) {
  if (!channel) await connect();
  await channel.assertQueue(queueName, { durable: true });

  console.log(`[Responder] Listening for requests on '${queueName}'`);

  channel.consume(queueName, async (msg) => {
    if (msg?.properties?.replyTo && msg?.properties?.correlationId) {
      const requestData = JSON.parse(msg.content.toString());

      // Run the user-provided logic (e.g., fetch from database)
      const result = await handler(requestData);

      // Send the result back to the replyTo queue
      channel.sendToQueue(
        msg?.properties?.replyTo,
        Buffer.from(JSON.stringify(result)),
        { correlationId: msg?.properties?.correlationId }
      );

      // Acknowledge the original message
      channel.ack(msg);
    }
  });
}

async function sendRPCRequest(queueName, data) {
  if (!channel) await connect();

  return new Promise(async (resolve, reject) => {
    const correlationId = uuidv4();

    // Create a temporary, exclusive queue for the reply
    const replyQueue = await channel.assertQueue("", { exclusive: true });

    // Set up a consumer to listen for the specific reply
    channel.consume(
      replyQueue.queue,
      (msg) => {
        if (msg?.properties?.correlationId === correlationId) {
          resolve(JSON.parse(msg.content.toString()));
          channel.deleteQueue(replyQueue.queue); // Clean up the temporary queue
        }
      },
      { noAck: true }
    );

    // Publish the request message with the 'replyTo' and 'correlationId' properties
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
