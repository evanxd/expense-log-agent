import { BaseMessage } from "@langchain/core/messages";

import { Guard } from "./types.js";

/**
 * An abstract base class for validators that operate on the results of tool usage.
 * It handles the boilerplate of extracting tool call results from the messages.
 */
export abstract class BaseToolGuard implements Guard {
  protected ADD_EXPENSE_TOOL_CALL_RESULT = "Expense added successfully.";
  protected DELETE_EXPENSE_TOOL_CALL_RESULT = "Expense deleted successfully.";
  protected GET_EXPENSE_TOOL_CALL_RESULT = "Expense retrieved successfully.";
  protected GET_EXPENSE_CATEGORIES_TOOL_CALL_RESULT =
    "Expense categories retrieved successfully.";
  protected GET_GROUPED_EXPENSES_TOOL_CALL_RESULT =
    "Grouped expenses retrieved successfully.";

  /**
   * The template method that extracts tool call results and delegates validation to subclasses.
   *
   * @param messages The messages from the LLM response.
   * @returns True if the tool call is valid, false otherwise.
   */
  public validate(messages: BaseMessage[]): boolean {
    const results = this.getToolCallResults(messages);
    return this.validateToolCalls(results);
  }

  /**
   * Subclasses must implement this method to define their specific validation logic.
   *
   * @param results A Set of tool call results extracted from the response.
   */
  protected abstract validateToolCalls(results: Set<string>): boolean;

  /**
   * Extracts the results from tool messages.
   *
   * @param messages The array of messages to process.
   * @returns A Set of stringified tool call results.
   */
  private getToolCallResults(messages: BaseMessage[]): Set<string> {
    return new Set(
      messages
        .filter((m) => m.getType() === "tool")
        .map((m) => JSON.parse(m.text).message),
    );
  }
}
