import dotenv from "dotenv";

import { startServer } from "./server.js";
import {
  addResultToStream,
  createRedisClient,
  yieldRequestsFromStream,
} from "./redis.js";
import {
  createAgent,
  runInstruction,
  to,
} from "./utils.js";

dotenv.config();

async function main() {
  const client = await createRedisClient();
  const agent = createAgent();

  for await (const request of yieldRequestsFromStream(client)) {
    const { requestId, instruction, sender, groupMembers, ledgerId, channelId, messageId } = request.message;
    const [error, messages] = await to(runInstruction(agent, instruction, sender, groupMembers, ledgerId, messageId));

    if (error) {
      let errorMessage = "An unknown error occurred.";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      await addResultToStream(client, { message: { result: errorMessage, channelId, messageId, requestId } });
    } else {
      const result = messages.at(-1)?.text;
      await addResultToStream(client, { message: { result, channelId, messageId, requestId } });
    }
    agent.resetMessages();
  }
}

startServer(Number(process.env.PORT));
main().catch(e => { console.error("Unhandled error in main function:", e); });
