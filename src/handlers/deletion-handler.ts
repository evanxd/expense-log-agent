import { RedisClientType } from "redis";
import { SwiftAgent } from "swift-agent";

import { addResultToStream } from "../utils/redis.js";
import { to } from "../utils/async.js";
import {
  RequestHandler,
  RequestMessage,
  ResultMessage,
} from "../utils/types.js";

const GET_EXPENSE_TOOL_NAME = "mcp__expense-log-mcp__getExpense";
const DELETE_EXPENSE_TOOL_NAME = "mcp__expense-log-mcp__deleteExpense";

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
          await getExpenseTool.invoke({ ledgerId, messageId }),
        );

        let result: ResultMessage = {
          message: { channelId, messageId, requestId },
        };
        if (getExpenseResult.success) {
          const deleteExpenseResult = JSON.parse(
            await deleteExpenseTool.invoke({ ledgerId, messageId }),
          );
          if (deleteExpenseResult.success) {
            result = {
              message: {
                result: "Expense deleted successfully.",
                channelId,
                messageId,
                requestId,
              },
            };
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
