import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { SwiftAgent } from "swift-agent";
import { RedisClientType } from "redis";

import { DeletionHandler } from "../../../src/request-handlers/handlers/deletion-handler.js";
import { addResultToStream } from "../../../src/utils/redis.js";
import { RequestMessage } from "../../../src/utils/types.js";

const mockGetTools = jest.fn();
jest.mock("swift-agent", () => {
  return {
    SwiftAgent: jest.fn().mockImplementation(() => {
      return {
        getTools: mockGetTools,
      };
    }),
  };
});

jest.mock("../../../src/utils/redis.js", () => ({
  addResultToStream: jest.fn(),
}));

describe("DeletionHandler", () => {
  let agent: SwiftAgent;
  let client: RedisClientType;
  let deletionHandler: DeletionHandler;

  const mockGetExpenseTool = {
    name: "get_expense",
    invoke: jest.fn(),
  };

  const mockDeleteExpenseTool = {
    name: "delete_expense",
    invoke: jest.fn(),
  };

  const baseRequest: RequestMessage = {
    id: "test-id",
    message: {
      channelId: "channel1",
      ledgerId: "ledger1",
      messageId: "message1",
      requestId: "request1",
      event: "messageDelete",
      instruction: "delete last",
      sender: "user1",
      groupMembers: "[]",
    },
  };

  beforeEach(() => {
    (SwiftAgent as jest.Mock).mockClear();
    mockGetTools.mockClear();
    (addResultToStream as jest.Mock).mockClear();
    mockGetExpenseTool.invoke.mockClear();
    mockDeleteExpenseTool.invoke.mockClear();

    agent = new SwiftAgent({} as BaseChatModel);
    client = {} as RedisClientType;

    mockGetTools.mockResolvedValue([mockGetExpenseTool, mockDeleteExpenseTool]);

    deletionHandler = new DeletionHandler(agent, client);
  });

  it("should do nothing if get_expense tool is not found", async () => {
    (agent.getTools as jest.Mock).mockResolvedValue([mockDeleteExpenseTool]);

    await deletionHandler.execute(baseRequest);

    expect(mockGetExpenseTool.invoke).not.toHaveBeenCalled();
    expect(mockDeleteExpenseTool.invoke).not.toHaveBeenCalled();
    expect(addResultToStream).not.toHaveBeenCalled();
  });

  it("should do nothing if delete_expense tool is not found", async () => {
    (agent.getTools as jest.Mock).mockResolvedValue([mockGetExpenseTool]);

    await deletionHandler.execute(baseRequest);

    expect(mockGetExpenseTool.invoke).not.toHaveBeenCalled();
    expect(mockDeleteExpenseTool.invoke).not.toHaveBeenCalled();
    expect(addResultToStream).not.toHaveBeenCalled();
  });

  it("should call get_expense and delete_expense tools and add result to stream on success", async () => {
    mockGetExpenseTool.invoke.mockResolvedValue(
      JSON.stringify({ success: true, message: "Expense found" }),
    );
    mockDeleteExpenseTool.invoke.mockResolvedValue(
      JSON.stringify({ success: true, message: "Expense deleted" }),
    );

    await deletionHandler.execute(baseRequest);

    expect(mockGetExpenseTool.invoke).toHaveBeenCalledWith({
      ledger_id: "ledger1",
      message_id: "message1",
    });
    expect(mockDeleteExpenseTool.invoke).toHaveBeenCalledWith({
      ledger_id: "ledger1",
      message_id: "message1",
    });
    expect(addResultToStream).toHaveBeenCalledWith(client, {
      message: {
        channelId: "channel1",
        messageId: "message1",
        requestId: "request1",
        result: "Expense deleted",
      },
    });
  });

  it("should not call delete_expense if get_expense fails", async () => {
    mockGetExpenseTool.invoke.mockResolvedValue(
      JSON.stringify({ success: false, message: "Expense not found" }),
    );

    await deletionHandler.execute(baseRequest);

    expect(mockGetExpenseTool.invoke).toHaveBeenCalledWith({
      ledger_id: "ledger1",
      message_id: "message1",
    });
    expect(mockDeleteExpenseTool.invoke).not.toHaveBeenCalled();
    expect(addResultToStream).toHaveBeenCalledWith(client, {
      message: {
        channelId: "channel1",
        messageId: "message1",
        requestId: "request1",
      },
    });
  });

  it("should handle deletion failure", async () => {
    mockGetExpenseTool.invoke.mockResolvedValue(
      JSON.stringify({ success: true, message: "Expense found" }),
    );
    mockDeleteExpenseTool.invoke.mockResolvedValue(
      JSON.stringify({ success: false, message: "Deletion failed" }),
    );

    await deletionHandler.execute(baseRequest);

    expect(mockGetExpenseTool.invoke).toHaveBeenCalledWith({
      ledger_id: "ledger1",
      message_id: "message1",
    });
    expect(mockDeleteExpenseTool.invoke).toHaveBeenCalledWith({
      ledger_id: "ledger1",
      message_id: "message1",
    });
    expect(addResultToStream).toHaveBeenCalledWith(client, {
      message: {
        channelId: "channel1",
        messageId: "message1",
        requestId: "request1",
      },
    });
  });

  it("should log an error if the process fails", async () => {
    const error = new Error("test error");
    mockGetExpenseTool.invoke.mockRejectedValue(error);

    const consoleErrorSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});

    await deletionHandler.execute(baseRequest);

    expect(consoleErrorSpy).toHaveBeenCalledWith(error);

    consoleErrorSpy.mockRestore();
  });
});
