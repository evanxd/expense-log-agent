import { AIMessage } from "@langchain/core/messages";

import { GuardChain } from "../../src/guard-chain";

describe("GuardChain", () => {
  let guardChain: GuardChain;

  beforeEach(() => {
    guardChain = new GuardChain();
  });

  it("should return false for an empty array of messages", async () => {
    const result = await guardChain.isValid([]);
    expect(result).toBe(false);
  });

  it("should return true for a message with no tool calls", async () => {
    const messages = [new AIMessage("Hello!")];
    const result = await guardChain.isValid(messages);
    expect(result).toBe(true);
  });

  it("should return true for a single delete_expense tool call", async () => {
    const messages = [
      new AIMessage({
        content: "",
        tool_calls: [{ name: "delete_expense", args: {}, id: "1" }],
      }),
    ];
    const result = await guardChain.isValid(messages);
    expect(result).toBe(true);
  });

  it("should return true for a single get_expense tool call", async () => {
    const messages = [
      new AIMessage({
        content: "",
        tool_calls: [{ name: "get_expense", args: {}, id: "1" }],
      }),
    ];
    const result = await guardChain.isValid(messages);
    expect(result).toBe(true);
  });

  it("should return true for a single get_grouped_expenses tool call", async () => {
    const messages = [
      new AIMessage({
        content: "",
        tool_calls: [{ name: "get_grouped_expenses", args: {}, id: "1" }],
      }),
    ];
    const result = await guardChain.isValid(messages);
    expect(result).toBe(true);
  });

  it("should return true for add_expense and get_expense_categories tool calls", async () => {
    const messages = [
      new AIMessage({
        content: "",
        tool_calls: [
          { name: "add_expense", args: {}, id: "1" },
          { name: "get_expense_categories", args: {}, id: "2" },
        ],
      }),
    ];
    const result = await guardChain.isValid(messages);
    expect(result).toBe(true);
  });

  it("should return true for get_grouped_expenses and get_expense_categories tool calls", async () => {
    const messages = [
      new AIMessage({
        content: "",
        tool_calls: [
          { name: "get_grouped_expenses", args: {}, id: "1" },
          { name: "get_expense_categories", args: {}, id: "2" },
        ],
      }),
    ];
    const result = await guardChain.isValid(messages);
    expect(result).toBe(true);
  });

  it("should return false for a single add_expense tool call", async () => {
    const messages = [
      new AIMessage({
        content: "",
        tool_calls: [{ name: "add_expense", args: {}, id: "1" }],
      }),
    ];
    const result = await guardChain.isValid(messages);
    expect(result).toBe(false);
  });

  it("should return false for multiple tool calls that do not match any guard", async () => {
    const messages = [
      new AIMessage({
        content: "",
        tool_calls: [
          { name: "delete_expense", args: {}, id: "1" },
          { name: "get_expense", args: {}, id: "2" },
        ],
      }),
    ];
    const result = await guardChain.isValid(messages);
    expect(result).toBe(false);
  });

  it("should return false for a tool call not covered by any guard", async () => {
    const messages = [
      new AIMessage({
        content: "",
        tool_calls: [{ name: "some_other_tool", args: {}, id: "1" }],
      }),
    ];
    const result = await guardChain.isValid(messages);
    expect(result).toBe(false);
  });
});
