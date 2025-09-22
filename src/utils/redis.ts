import { createClient, RedisClientType } from "redis";

import { RequestMessage, ResultMessage } from "./types.js";

const REDIS_OPTIONS = {
  username: process.env.REDIS_USERNAME,
  password: process.env.REDIS_PASSWORD,
  socket: {
    host: process.env.REDIS_HOST,
    port: Number(process.env.REDIS_PORT),
  },
};
const STREAM_REQUESTS = process.env.STREAM_REQUESTS || "discord:requests";
const STREAM_RESULTS = process.env.STREAM_RESULTS || "discord:results";
const XREAD_BLOCK_MS = 5000;
const XREAD_COUNT = 10;

/**
 * Creates and connects a Redis client.
 *
 * @returns A promise that resolves to a connected RedisClientType instance.
 * @throws Will throw an error if the initial connection fails.
 */
export async function createRedisClient(): Promise<RedisClientType> {
  const client = createClient(REDIS_OPTIONS);
  client.on("error", (e) => {
    throw e;
  });
  await client.connect();
  return client as RedisClientType;
}

/**
 * Adds a result message to the Redis results stream.
 *
 * @param client The Redis client instance.
 * @param result The task result message to add to the stream.
 */
export async function addResultToStream(
  client: RedisClientType,
  result: ResultMessage,
) {
  await client.xAdd(STREAM_RESULTS, "*", result.message);
}

/**
 * An async generator that yields task requests from the Redis requests stream.
 *
 * @param client The Redis client instance.
 * @yields {RequestMessage} A task request message from the stream.
 */
export async function* yieldRequestsFromStream(client: RedisClientType) {
  let lastId = "0";
  while (true) {
    const streams = await client.xRead([{ key: STREAM_REQUESTS, id: lastId }], {
      BLOCK: XREAD_BLOCK_MS,
      COUNT: XREAD_COUNT,
    });

    if (streams && Array.isArray(streams) && streams.length > 0) {
      for (const message of streams[0].messages) {
        yield message as RequestMessage;
        lastId = message.id;
      }
    }
  }
}
