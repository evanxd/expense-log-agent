import dotenv from "dotenv";

import { startServer } from "./utils/server.js";
import {
  createRedisClient,
  yieldRequestsFromStream,
} from "./utils/redis.js";
import { createAgent } from "./utils/agent.js"
import { createHandler } from "./handlers/handler-factory.js";

dotenv.config();

async function main() {
  const agent = await createAgent();
  const client = await createRedisClient();

  for await (const request of yieldRequestsFromStream(client)) {
    const handler = createHandler(request.message.event, agent, client);
    await handler.execute(request);
  }
}

startServer(Number(process.env.PORT));
main().catch(e => { console.error("Unhandled error in main function:", e); });
