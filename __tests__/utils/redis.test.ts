import { createClient, RedisClientType } from "redis";

import {
  createRedisClient,
  addResultToStream,
  yieldRequestsFromStream,
} from "../../src/utils/redis";
import { ResultMessage, RequestMessage } from "../../src/utils/types";

jest.mock("redis", () => ({
  createClient: jest.fn(),
}));

describe("redis utils", () => {
  const mockCreateClient = createClient as jest.Mock;
  let mockClient: {
    on: jest.Mock;
    connect: jest.Mock;
    xAdd: jest.Mock;
    xRead: jest.Mock;
  };

  beforeEach(() => {
    mockClient = {
      on: jest.fn(),
      connect: jest.fn().mockResolvedValue(undefined),
      xAdd: jest.fn().mockResolvedValue(undefined),
      xRead: jest.fn().mockResolvedValue(null),
    };
    mockCreateClient.mockReturnValue(mockClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("createRedisClient", () => {
    it("should create and connect a redis client", async () => {
      const client = await createRedisClient();
      expect(mockCreateClient).toHaveBeenCalled();
      expect(mockClient.on).toHaveBeenCalledWith("error", expect.any(Function));
      expect(mockClient.connect).toHaveBeenCalled();
      expect(client).toBe(mockClient);
    });

    it("should throw an error if connection fails", async () => {
      const error = new Error("Connection failed");
      mockClient.connect.mockRejectedValue(error);
      await expect(createRedisClient()).rejects.toThrow(error);
    });

    it("should set up an error listener that throws", async () => {
      await createRedisClient();
      expect(mockClient.on).toHaveBeenCalledWith("error", expect.any(Function));
      const errorCallback = mockClient.on.mock.calls.find(
        (call: [string, (err: Error) => void]) => call[0] === "error",
      )[1];
      const testError = new Error("test error");
      expect(() => errorCallback(testError)).toThrow(testError);
    });
  });

  describe("addResultToStream", () => {
    it("should add a result to the stream", async () => {
      const result: ResultMessage = {
        message: {
          requestId: "abc",
          result: "some result",
          channelId: "ch1",
          messageId: "msg1",
        },
      };
      await addResultToStream(mockClient as unknown as RedisClientType, result);
      expect(mockClient.xAdd).toHaveBeenCalledWith(
        process.env.STREAM_RESULTS || "discord:results",
        "*",
        result.message,
      );
    });
  });

  describe("yieldRequestsFromStream", () => {
    it("should yield requests from the stream", async () => {
      const messages: RequestMessage[] = [
        {
          id: "1",
          message: {
            requestId: "req1",
            event: "messageCreate",
            instruction: "do something",
            sender: "user1",
            groupMembers: "[]",
            ledgerId: "ledger1",
            channelId: "channel1",
            messageId: "message1",
          },
        },
      ];

      mockClient.xRead.mockResolvedValueOnce([
        {
          messages: messages,
        },
      ]);

      const generator = yieldRequestsFromStream(
        mockClient as unknown as RedisClientType,
      );
      const next = await generator.next();
      expect(next.value).toEqual(messages[0]);
    });

    it("should handle empty stream reads", async () => {
      const message: RequestMessage = {
        id: "1",
        message: {
          requestId: "req1",
          event: "messageCreate",
          instruction: "do something",
          sender: "user1",
          groupMembers: "[]",
          ledgerId: "ledger1",
          channelId: "channel1",
          messageId: "message1",
        },
      };
      mockClient.xRead.mockResolvedValueOnce(null).mockResolvedValueOnce([
        {
          messages: [message],
        },
      ]);

      const generator = yieldRequestsFromStream(
        mockClient as unknown as RedisClientType,
      );
      const result = await generator.next();

      expect(result.value).toEqual(message);
      expect(mockClient.xRead).toHaveBeenCalledTimes(2);
    });

    it("should update lastId between reads", async () => {
      const messages1: RequestMessage[] = [
        {
          id: "1",
          message: {
            requestId: "req1",
            event: "messageCreate",
            instruction: "do something",
            sender: "user1",
            groupMembers: "[]",
            ledgerId: "ledger1",
            channelId: "channel1",
            messageId: "message1",
          },
        },
      ];
      const messages2: RequestMessage[] = [
        {
          id: "2",
          message: {
            requestId: "req2",
            event: "messageCreate",
            instruction: "do something",
            sender: "user1",
            groupMembers: "[]",
            ledgerId: "ledger1",
            channelId: "channel1",
            messageId: "message1",
          },
        },
      ];

      mockClient.xRead
        .mockResolvedValueOnce([{ messages: messages1 }])
        .mockResolvedValueOnce([{ messages: messages2 }]);

      const generator = yieldRequestsFromStream(
        mockClient as unknown as RedisClientType,
      );
      await generator.next();
      await generator.next();

      expect(mockClient.xRead).toHaveBeenCalledTimes(2);
      expect(mockClient.xRead.mock.calls[0][0]).toEqual([
        { key: expect.any(String), id: "0" },
      ]);
      expect(mockClient.xRead.mock.calls[1][0]).toEqual([
        { key: expect.any(String), id: "1" },
      ]);
    });
  });
});
