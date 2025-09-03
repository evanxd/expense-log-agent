import { createClient, RedisClientOptions, RedisClientType } from "redis";

async function addResult(client: RedisClientType, message: { [key: string]: string; }) {
  await client.xAdd("discord:results", "*", message);
}

async function generateClient(options: RedisClientOptions): Promise<RedisClientType> {
  const client = createClient(options);
  client.on("error", (err) => console.log("Redis Client Error", err));
  await client.connect();
  return client as RedisClientType;
}

async function waitForTasks(client: RedisClientType, callback: (task: { [key: string]: string; }) => void) {
  let lastId = "0";
  while (true) {
    const streams = await client.xRead(
        [{ key: "discord:tasks", id: lastId }],
        { COUNT: 1, BLOCK: 5000 }
    );
    if (streams && Array.isArray(streams)) {
      for (const message of streams[0].messages) {
        await callback(message.message);
        lastId = message.id;
      }
    }
  }
}

export { addResult, generateClient, waitForTasks }
