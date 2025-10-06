import { RedisClientType } from "redis";
import { SwiftAgent } from "swift-agent";

import { addResultToStream } from "../../utils/redis.js";
import { runInstruction } from "../../utils/agent.js";
import { to } from "../../utils/async.js";
import { RequestHandler, RequestMessage } from "../../utils/types.js";

export class GeneralCaseHandler implements RequestHandler {
  private agent: SwiftAgent;
  private client: RedisClientType;

  constructor(agent: SwiftAgent, client: RedisClientType) {
    this.agent = agent;
    this.client = client;
  }

  async execute(request: RequestMessage): Promise<void> {
    const {
      requestId,
      instruction,
      sender,
      groupMembers,
      ledgerId,
      channelId,
      messageId,
    } = request.message;

    const [error, resultMessage] = await to(
      (async () => {
        return await runInstruction(
          this.agent,
          instruction,
          sender,
          groupMembers,
          ledgerId,
          messageId,
        );
      })(),
    );

    let result = resultMessage;
    if (error) {
      console.error(
        `Error processing request ${requestId} for instruction: "${instruction}"`,
        error,
      );
      result = error.message;
    }

    await addResultToStream(this.client, {
      message: { result, channelId, messageId, requestId },
    });
    this.agent.resetMessages();
  }
}
