import { ChatGroq as Model } from "@langchain/groq";
import { SwiftAgent } from "swift-agent";

import { GuardChain } from "../guard-chain/index.js";

import { to } from "./async.js";
import { systemPrompt, userPrompt } from "./prompts.js";

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
export async function createAgent(): Promise<SwiftAgent> {
  if (!process.env.MCP_SERVER_URL || !process.env.MCP_SECRET_KEY) {
    throw Error(
      "Missing MCP_SERVER_URL or MCP_SECRET_KEY environment variables.",
    );
  }

  const llm = new Model({
    apiKey: process.env.MODEL_API_KEY,
    model: process.env.MODEL_NAME || "openai/gpt-oss-20b",
  });
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
): Promise<string> {
  const guard = new GuardChain();
  let errorToThrow: Error | null = null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const [error, messages] = await to(
        agent.run(
          userPrompt(instruction, sender, groupMembers, ledgerId, messageIdId),
        ),
      );

      if (error) {
        errorToThrow = error;
        continue;
      }

      if (messages && !(await guard.isValid(messages))) {
        errorToThrow = new Error(
          "This request did not pass the assertion from the guard chain.",
        );
        continue;
      }

      const text = messages.at(-1)?.text;
      if (text) {
        return text;
      }
    } finally {
      agent.resetMessages();
    }
  }

  console.error(errorToThrow);
  throw errorToThrow;
}
