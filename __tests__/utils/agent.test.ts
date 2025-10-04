import {
  AIMessage,
  BaseMessage,
  HumanMessage,
  SystemMessage,
} from "@langchain/core/messages";
import { ChatGroq } from "@langchain/groq";
import { SwiftAgent } from "swift-agent";

import { GuardChain } from "../../src/guard-chain";
import { createAgent, runInstruction } from "../../src/utils/agent";
import { to } from "../../src/utils/async";
import { userPrompt } from "../../src/utils/prompts";

jest.mock("@langchain/groq");
jest.mock("swift-agent");
jest.mock("../../src/guard-chain");
jest.mock("../../src/utils/async");
jest.mock("../../src/utils/prompts", () => ({
  userPrompt: jest.fn(),
  systemPrompt: "mocked system prompt",
}));

const MockedSwiftAgent = SwiftAgent as jest.MockedClass<typeof SwiftAgent>;
const MockedGuardChain = GuardChain as jest.MockedClass<typeof GuardChain>;
const mockedTo = to as jest.Mock;
const mockedUserPrompt = userPrompt as jest.Mock;

describe("Agent Utils", () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  describe("createAgent", () => {
    it("should throw an error if MCP_SERVER_URL is not set", async () => {
      delete process.env.MCP_SERVER_URL;
      process.env.MCP_SECRET_KEY = "test-secret";
      await expect(createAgent()).rejects.toThrow(
        "Missing MCP_SERVER_URL or MCP_SECRET_KEY environment variables.",
      );
    });

    it("should throw an error if MCP_SECRET_KEY is not set", async () => {
      process.env.MCP_SERVER_URL = "http://test.com";
      delete process.env.MCP_SECRET_KEY;
      await expect(createAgent()).rejects.toThrow(
        "Missing MCP_SERVER_URL or MCP_SECRET_KEY environment variables.",
      );
    });

    it("should create and initialize a SwiftAgent with correct config", async () => {
      process.env.MCP_SERVER_URL = "http://test.com";
      process.env.MCP_SECRET_KEY = "test-secret";
      process.env.MODEL_API_KEY = "test-api-key";
      process.env.MODEL_NAME = "test-model";

      const mockAgentInstance = {
        initialize: jest.fn().mockResolvedValue(undefined),
      };
      MockedSwiftAgent.mockImplementation(
        () => mockAgentInstance as unknown as SwiftAgent,
      );

      const agent = await createAgent();

      expect(ChatGroq).toHaveBeenCalledWith({
        apiKey: "test-api-key",
        model: "test-model",
      });

      expect(MockedSwiftAgent).toHaveBeenCalledWith(expect.any(ChatGroq), {
        mcp: {
          mcpServers: {
            "expense-log-mcp": {
              url: "http://test.com",
              headers: {
                authorization: "Bearer test-secret",
              },
            },
          },
          additionalToolNamePrefix: "",
          prefixToolNameWithServerName: false,
        },
        systemPrompt: "mocked system prompt",
      });

      expect(mockAgentInstance.initialize).toHaveBeenCalled();
      expect(agent).toBe(mockAgentInstance);
    });
  });

  describe("runInstruction", () => {
    let mockAgent: jest.Mocked<SwiftAgent>;
    let consoleErrorSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleErrorSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      mockAgent = {
        run: jest.fn(),
        resetMessages: jest.fn(),
      } as unknown as jest.Mocked<SwiftAgent>;
      mockedTo.mockImplementation((promise: Promise<unknown>) =>
        promise
          .then((data: unknown) => [null, data])
          .catch((err: unknown) => [err, undefined]),
      );
      mockedUserPrompt.mockReturnValue("test-prompt");
      MockedGuardChain.prototype.isValid.mockResolvedValue(true);
    });

    afterEach(() => {
      consoleErrorSpy.mockRestore();
    });

    it("should return the text from the last message on successful execution", async () => {
      const messages: BaseMessage[] = [
        new SystemMessage("first"),
        new HumanMessage("second"),
      ];
      mockAgent.run.mockResolvedValue(messages);

      const result = await runInstruction(
        mockAgent,
        "instruction",
        "sender",
        "groupMembers",
        "ledgerId",
        "messageId",
      );

      expect(result).toBe("second");
      expect(mockAgent.run).toHaveBeenCalledWith("test-prompt");
      expect(mockAgent.run).toHaveBeenCalledTimes(1);
      expect(mockAgent.resetMessages).toHaveBeenCalledTimes(1);
    });

    it("should throw an error if agent.run() fails and retries exhaust", async () => {
      const error = new Error("Agent run failed");
      mockAgent.run.mockRejectedValue(error);

      await expect(
        runInstruction(
          mockAgent,
          "instruction",
          "sender",
          "groupMembers",
          "ledgerId",
          "messageId",
          3,
        ),
      ).rejects.toThrow("Agent run failed");

      expect(mockAgent.run).toHaveBeenCalledTimes(3);
      expect(mockAgent.resetMessages).toHaveBeenCalledTimes(3);
    });

    it("should throw an error if guard.isValid() returns false and retries exhaust", async () => {
      const messages: BaseMessage[] = [
        new SystemMessage("first"),
        new HumanMessage("second"),
        new AIMessage("final response"),
      ];
      mockAgent.run.mockResolvedValue(messages);
      MockedGuardChain.prototype.isValid.mockResolvedValue(false);

      await expect(
        runInstruction(
          mockAgent,
          "instruction",
          "sender",
          "groupMembers",
          "ledgerId",
          "messageId",
          3,
        ),
      ).rejects.toThrow(
        "This request did not pass the assertion from the guard chain.",
      );

      expect(mockAgent.run).toHaveBeenCalledTimes(3);
      expect(MockedGuardChain.prototype.isValid).toHaveBeenCalledTimes(3);
      expect(mockAgent.resetMessages).toHaveBeenCalledTimes(3);
    });

    it("should succeed on a subsequent attempt", async () => {
      const messages: BaseMessage[] = [
        new SystemMessage("first"),
        new HumanMessage("second"),
        new AIMessage("final response"),
      ];
      mockAgent.run
        .mockRejectedValueOnce(new Error("First fail"))
        .mockResolvedValue(messages);

      const result = await runInstruction(
        mockAgent,
        "instruction",
        "sender",
        "groupMembers",
        "ledgerId",
        "messageId",
        3,
      );

      expect(result).toBe("final response");
      expect(mockAgent.run).toHaveBeenCalledTimes(2);
      expect(mockAgent.resetMessages).toHaveBeenCalledTimes(2);
    });

    it("should throw null if the last message has no text after all retries", async () => {
      const messages: BaseMessage[] = [
        new SystemMessage("first"),
        new HumanMessage("second"),
        new AIMessage(""),
      ];
      mockAgent.run.mockResolvedValue(messages);

      await expect(
        runInstruction(
          mockAgent,
          "instruction",
          "sender",
          "groupMembers",
          "ledgerId",
          "messageId",
        ),
      ).rejects.toBe(null);

      expect(mockAgent.run).toHaveBeenCalledTimes(3);
      expect(mockAgent.resetMessages).toHaveBeenCalledTimes(3);
    });
  });
});
