import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { RedisClientType } from "redis";
import { SwiftAgent } from "swift-agent";

import { GeneralCaseHandler } from "../../../src/request-handlers/handlers/general-case-handler.js";
import { addResultToStream } from "../../../src/utils/redis.js";
import { runInstruction } from "../../../src/utils/agent.js";
import { RequestMessage } from "../../../src/utils/types.js";

jest.mock("swift-agent", () => ({
  SwiftAgent: jest.fn().mockImplementation(() => ({
    resetMessages: jest.fn(),
  })),
}));

jest.mock("../../../src/utils/redis.js", () => ({
  addResultToStream: jest.fn(),
}));

jest.mock("../../../src/utils/agent.js", () => ({
  runInstruction: jest.fn(),
}));

describe("GeneralCaseHandler", () => {
  let agent: SwiftAgent;
  let client: RedisClientType;
  let handler: GeneralCaseHandler;

  const baseRequest: RequestMessage = {
    id: "test-id",
    message: {
      requestId: "request1",
      instruction: "test instruction",
      sender: "user1",
      groupMembers: "[]",
      ledgerId: "ledger1",
      channelId: "channel1",
      messageId: "message1",
      event: "messageCreate",
    },
  };

  beforeEach(() => {
    agent = new SwiftAgent({} as BaseChatModel);
    client = {} as RedisClientType;
    handler = new GeneralCaseHandler(agent, client);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should call runInstruction and add the result to the stream", async () => {
    const mockResult = "Instruction executed successfully";
    (runInstruction as jest.Mock).mockResolvedValue(mockResult);

    await handler.execute(baseRequest);

    expect(runInstruction).toHaveBeenCalledWith(
      agent,
      baseRequest.message.instruction,
      baseRequest.message.sender,
      baseRequest.message.groupMembers,
      baseRequest.message.ledgerId,
      baseRequest.message.messageId,
    );
    expect(addResultToStream).toHaveBeenCalledWith(client, {
      message: {
        result: mockResult,
        channelId: baseRequest.message.channelId,
        messageId: baseRequest.message.messageId,
        requestId: baseRequest.message.requestId,
      },
    });
    expect(agent.resetMessages).toHaveBeenCalled();
  });

  it("should handle errors from runInstruction and add the error message to the stream", async () => {
    const mockError = new Error("Instruction failed");
    (runInstruction as jest.Mock).mockRejectedValue(mockError);

    const consoleErrorSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});

    await handler.execute(baseRequest);

    expect(runInstruction).toHaveBeenCalledWith(
      agent,
      baseRequest.message.instruction,
      baseRequest.message.sender,
      baseRequest.message.groupMembers,
      baseRequest.message.ledgerId,
      baseRequest.message.messageId,
    );
    expect(addResultToStream).toHaveBeenCalledWith(client, {
      message: {
        result: mockError.message,
        channelId: baseRequest.message.channelId,
        messageId: baseRequest.message.messageId,
        requestId: baseRequest.message.requestId,
      },
    });
    expect(agent.resetMessages).toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      `Error processing request ${baseRequest.message.requestId} for instruction: "${baseRequest.message.instruction}"`,
      mockError,
    );

    consoleErrorSpy.mockRestore();
  });
});
