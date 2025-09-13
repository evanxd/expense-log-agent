import { ChatGoogleGenerativeAI as Model } from "@langchain/google-genai";
import { SwiftAgent } from "swift-agent";
import dotenv from "dotenv";

import { systemPrompt } from "./prompts.js";
import { startServer } from "./server.js";
import {
  addResultToStream,
  createRedisClient,
  yieldRequestsFromStream,
} from "./redis.js";
import {
  runInstruction,
  to,
} from "./utils.js";

dotenv.config();

const llm = new Model({
  model: process.env.MODEL_NAME || "gemini-2.5-flash",
  apiKey: process.env.GEMINI_API_KEY
});
const mcp = {
  mcpServers: {
    "expense-log-mcp": {
      command: "npx",
      args: ["-y", `expense-log-mcp@${process.env.EXPENSE_LOG_MCP_VERSION}`],
      env: { DATABASE_URL: process.env.DATABASE_URL }
    }
  }
};
const agent = new SwiftAgent(llm, { mcp, systemPrompt });

async function main() {
  const client = await createRedisClient();

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
