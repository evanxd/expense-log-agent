import { ChatGroq as Model } from "@langchain/groq";
import { BaseMessage } from "@langchain/core/messages";
import { SwiftAgent } from "swift-agent";

import { systemPrompt, userPrompt } from "./prompts.js"

/**
 * Creates and configures a SwiftAgent instance.
 *
 * This function initializes the language model (ChatGoogleGenerativeAI) and
 * sets up the necessary configuration for the Multi-Content Platform (MCP)
 * using environment variables. It then bundles it all into a new SwiftAgent.
 *
 * @returns A fully configured SwiftAgent instance ready to be used.
 * @throws If the MCP_SERVER_URL or MCP_SECRET_KEY environment variables are not set.
 */
export async function createAgent() {
  const llm = new Model({
    apiKey: process.env.MODEL_API_KEY,
    model: process.env.MODEL_NAME || "openai/gpt-oss-20b",
  });

  if (process.env.MCP_SERVER_URL) {
    const mcp = {
      mcpServers: {
        "expense-log-mcp": {
          url: process.env.MCP_SERVER_URL,
          headers: {
            authorization: `Bearer ${process.env.MCP_SECRET_KEY}`,
          },
        },
      },
    };
    const agent = new SwiftAgent(llm, { mcp, systemPrompt });
    await agent.initialize();
    return agent;
  } else {
    throw Error("Missing MCP_SERVER_URL or MCP_SECRET_KEY environment variables.");
  }
}

/**
 * Runs an instruction using a SwiftAgent, with built-in retry logic for specific scenarios.
 *
 * @param agent The SwiftAgent instance to run.
 * @param instruction The instruction for the agent to execute.
 * @param sender The user who initiated the request.
 * @param groupMembers A JSON string array of group members.
 * @param ledgerId The ID of the ledger associated with the instruction.
 * @param messageIdId The ID of the message related to the instruction.
 * @param maxAttempts The maximum number of attempts to try. Defaults to 3.
 * @returns A promise that resolves to an array of BaseMessage representing the agent's execution result.
 * @throws If the instruction fails to execute successfully after the maximum number of attempts.
 */
export async function runInstruction(
  agent: SwiftAgent,
  instruction: string,
  sender: string,
  groupMembers: string,
  ledgerId: string,
  messageIdId: string,
  maxAttempts: number = 3,
): Promise<BaseMessage[]> {
  let messages: BaseMessage[] = [];

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    messages = await agent.run(userPrompt(instruction, sender, groupMembers, ledgerId, messageIdId));
    const toolMessage = messages.at(-2);
    if (toolMessage?.getType() === "tool") {
      const response = JSON.parse(toolMessage.text);
      // When adding an expense, ensure the agent provides a complete response,
      // not just the expense categories.
      if (response.message !== "Expense categories retrieved successfully.") {
        return messages;
      }
    }
  }

  throw Error("Failed to add expense.");
}

/**
 * Wraps a promise to enable error handling without a try-catch block,
 * inspired by the `await-to-js` library. This allows for a cleaner,
 * functional approach to handling asynchronous operations that might fail.
 *
 * @template T The type of the resolved value of the promise.
 * @param promise The promise to be wrapped.
 * @returns A promise that always resolves to a tuple. If the original
 *          promise resolves, the tuple is `[null, data]`. If it rejects,
 *          the tuple is `[error, undefined]`.
 */
export function to<T>(promise: Promise<T>): Promise<[Error, undefined] | [null, T]> {
  return promise
    .then<[null, T]>((data) => [null, data])
    .catch<[Error, undefined]>((err) => [err, undefined]);
}
