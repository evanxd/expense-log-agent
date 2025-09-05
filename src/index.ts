import { ChatGoogleGenerativeAI as Model } from "@langchain/google-genai";
import { SwiftAgent } from "swift-agent";
import { systemPrompt } from "./prompts.js"
import { addExpenseWithRetry, addResult, generateClient, getRequests } from "./redis-helper.js";
import dotenv from "dotenv";

dotenv.config();

const REDIS_OPTIONS = {
  username: process.env.REDIS_USERNAME,
  password: process.env.REDIS_PASSWORD,
  socket: {
    host: process.env.REDIS_HOST,
    port: Number(process.env.REDIS_PORT)
  }
}

const llm = new Model({
  model: process.env.MODEL_NAME || "gemini-2.5-flash",
  apiKey: process.env.GEMINI_API_KEY
});
const mcp = {
  mcpServers: {
    "expense-log-mcp": {
      command: "npx",
      args: ["-y", `expense-log-mcp@${process.env.EXPENSE_LOG_MCP_VERSION || '0.0.5'}`],
      env: { DATABASE_URL: process.env.DATABASE_URL }
    }
  }
};
const agent = new SwiftAgent(llm, { mcp, systemPrompt });

async function main() {
  const client = await generateClient(REDIS_OPTIONS);
  for await (const request of getRequests(client)) {
    const { requestId, instruction, sender, groupMembers, ledgerId, channelId } = request.message;

    try {
      const messages = await addExpenseWithRetry(agent, instruction, sender, groupMembers, ledgerId);
      const result = messages.at(-1)?.text;
      if (result) {
        await addResult(client, { message: { result, channelId, requestId } });
      } else {
        throw new Error("The agent's final response did not contain any text.");
      }
    } catch (e) {
      let errorMessage = "An unknown error occurred.";
      if (e instanceof Error) {
        errorMessage = e.message;
      }
      await addResult(client, { message: { result: errorMessage, channelId, requestId } });
    } finally {
      agent.resetMessages();
    }
  }
}

main().catch(e => {
  console.error("Unhandled error in main function:", e);
});
