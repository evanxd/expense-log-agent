import { ChatGoogleGenerativeAI as Model } from "@langchain/google-genai";
import { SwiftAgent } from "swift-agent";
import { systemPrompt, userPrompt } from "./prompts.js"
import { addResult, generateClient, waitForTasks } from "./redis-helper.js";
import dotenv from "dotenv";
import { BaseMessage } from "@langchain/core/messages";

dotenv.config();

const REDIS_OPTIONS = {
  username: process.env.REDIS_USERNAME,
  password: process.env.REDIS_PASSWORD,
  socket: {
    host: process.env.REDIS_HOST,
    port: Number(process.env.REDIS_PORT),
  }
}
const redisClient = await generateClient(REDIS_OPTIONS);

const llm = new Model({
  model: "gemini-2.5-flash",
  apiKey: process.env.GEMINI_API_KEY,
});
const mcp = {
  mcpServers: {
    "expense-log-mcp": {
      command: "npx",
      args: ["-y", "expense-log-mcp@1.0.9"],
      env: { DATABASE_URL: process.env.DATABASE_URL },
    },
  },
};
const agent = new SwiftAgent(llm, { mcp, systemPrompt });

await waitForTasks(redisClient, async (message) => {
    const { taskId, task, sender, groupMembers, ledgerId, channelId } = message;
    try {
      // Retry adding expense up to 3 times, as the agent might first ask for categories.
      const result = await addExpenseWithRetry(agent, task, sender, groupMembers, ledgerId);
      const text = result.at(-1)?.text;
      if (text) {
        await addResult(redisClient, {
          result: text, channelId, taskId,
        });
      } else {
        throw new Error("The agent's final response did not contain any text.");
      }
    } catch (e: unknown) {
      let result = "An unexpected error occurred while processing your request.";
      if (e instanceof Error) {
        result = `Error: ${e.message}`;
      }
      await addResult(redisClient, { result, channelId, taskId });
    } finally {
      agent.resetMessages();
    }
});

async function addExpenseWithRetry(
  agent: SwiftAgent,
  task: string,
  sender: string,
  groupMembers: string,
  ledgerId: string,
  maxAttempts: number = 3,
): Promise<BaseMessage[]> {
  let result: BaseMessage[] = [];
  let attempts = 0;
  let expenseAdded = false;
  while (attempts < maxAttempts && !expenseAdded) {
    result = await agent.run(userPrompt(task, sender, groupMembers, ledgerId));
    const toolOutput = result.at(-2);
    if (toolOutput?.getType().toString() === "tool") {
      const response = JSON.parse(toolOutput.text!);
      if (response.message === "Expense added successfully.") {
        expenseAdded = true;
      }
    }
    attempts++;
  }
  return result;
}
