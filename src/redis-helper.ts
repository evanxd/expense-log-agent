import { BaseMessage } from "@langchain/core/messages";
import { createClient, RedisClientOptions, RedisClientType } from "redis";
import { SwiftAgent } from "swift-agent";
import { userPrompt } from "./prompts.js"

const STREAM_REQUESTS = "discord:requests";
const STREAM_RESULTS = "discord:results";
const XREAD_BLOCK_MS = 5000;
const XREAD_COUNT = 10;

interface TaskRequestMessage {
  id: string;
  message: {
    requestId: string;
    instruction: string;
    sender: string;
    /** A JSON string array of usernames. */
    groupMembers: string;
    ledgerId: string;
    channelId: string;
    messageId?: string;
  };
}

interface TaskResultMessage {
  message: {
    result: string;
    channelId: string;
    requestId: string;
  };
}

/**
 * Attempts to add an expense by running a SwiftAgent, retrying on failure.
 * The retry logic handles cases where the agent first asks for expense categories.
 *
 * @param agent The SwiftAgent instance to run.
 * @param instruction The instruction for the agent to execute.
 * @param sender The user who initiated the request.
 * @param groupMembers A JSON string array of group members.
 * @param ledgerId The ID of the ledger to add the expense to.
 * @param maxAttempts The maximum number of attempts to try. Defaults to 3.
 * @returns A promise that resolves to an array of BaseMessage representing the agent's execution result.
 * @throws If the expense cannot be added after the maximum number of attempts.
 */
export async function runInstruction(
  agent: SwiftAgent,
  instruction: string,
  sender: string,
  groupMembers: string,
  ledgerId: string,
  maxAttempts: number = 3,
): Promise<BaseMessage[]> {
  let messages: BaseMessage[] = [];

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    messages = await agent.run(userPrompt(instruction, sender, groupMembers, ledgerId));
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
 * Adds a result message to the Redis results stream.
 *
 * @param client The Redis client instance.
 * @param result The task result message to add to the stream.
 */
export async function addResult(client: RedisClientType, result: TaskResultMessage) {
  await client.xAdd(STREAM_RESULTS, "*", result.message);
}

/**
 * Creates and connects a Redis client.
 *
 * @param options The Redis client options.
 * @returns A promise that resolves to a connected RedisClientType instance.
 * @throws Will throw an error if the initial connection fails.
 */
export async function generateClient(options: RedisClientOptions): Promise<RedisClientType> {
  const client = createClient(options);
  client.on("error", e => { throw e; });
  await client.connect();
  return client as RedisClientType;
}

/**
 * An async generator that yields task requests from the Redis requests stream.
 *
 * @param client The Redis client instance.
 * @yields {TaskRequestMessage} A task request message from the stream.
 */
export async function* getRequests(client: RedisClientType) {
  let lastId = "0";
  while (true) {
    const streams = await client.xRead(
        [{ key: STREAM_REQUESTS, id: lastId }],
        { BLOCK: XREAD_BLOCK_MS, COUNT: XREAD_COUNT }
    );

    if (streams && Array.isArray(streams) && streams.length > 0) {
      for (const message of streams[0].messages) {
        yield message as TaskRequestMessage;
        lastId = message.id;
      }
    }
  }
}
