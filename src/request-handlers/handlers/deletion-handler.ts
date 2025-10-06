import { RedisClientType } from "redis";
import { SwiftAgent } from "swift-agent";

import { addResultToStream } from "../../utils/redis.js";
import { to } from "../../utils/async.js";
import {
  RequestHandler,
  RequestMessage,
  ResultMessage,
} from "../../utils/types.js";

const GET_EXPENSE_TOOL_NAME = "get_expense";
const DELETE_EXPENSE_TOOL_NAME = "delete_expense";

export class DeletionHandler implements RequestHandler {
  private agent: SwiftAgent;
  private client: RedisClientType;

  constructor(agent: SwiftAgent, client: RedisClientType) {
    this.agent = agent;
    this.client = client;
  }

  async execute(request: RequestMessage): Promise<void> {
    const getExpenseTool = (await this.agent.getTools()).find(
      (tool) => tool.name === GET_EXPENSE_TOOL_NAME,
    );
    const deleteExpenseTool = (await this.agent.getTools()).find(
      (tool) => tool.name === DELETE_EXPENSE_TOOL_NAME,
    );
    if (!getExpenseTool || !deleteExpenseTool) {
      return;
    }

    const [error] = await to(
      (async () => {
        const { channelId, ledgerId, messageId, requestId } = request.message;
        const getExpenseResult = JSON.parse(
          await getExpenseTool.invoke({
            ledger_id: ledgerId,
            message_id: messageId,
          }),
        );

        const result: ResultMessage = {
          message: { channelId, messageId, requestId },
        };

        if (getExpenseResult.success) {
          const deleteExpenseResult = JSON.parse(
            await deleteExpenseTool.invoke({
              ledger_id: ledgerId,
              message_id: messageId,
            }),
          );
          if (deleteExpenseResult.success) {
            result.message.result = deleteExpenseResult.message;
          }
        }

        await addResultToStream(this.client, result);
      })(),
    );

    if (error) {
      console.error(error);
    }
  }
}
