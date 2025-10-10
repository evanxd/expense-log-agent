import { AIMessage, BaseMessage } from "@langchain/core/messages";

/**
 * An abstract base class for validators that operate on the results of tool usage.
 * It handles the boilerplate of extracting tool call results from the messages.
 */
export abstract class BaseToolGuard implements Guard {
  protected ADD_EXPENSE_TOOL_NAME = "add_expense";
  protected DELETE_EXPENSE_TOOL_NAME = "delete_expense";
  protected GET_EXPENSE_TOOL_NAME = "get_expense";
  protected GET_EXPENSE_CATEGORIES_TOOL_NAME = "get_expense_categories";
  protected GET_GROUPED_EXPENSES_TOOL_NAME = "get_grouped_expenses";

  /**
   * The template method that extracts tool call results and delegates validation to subclasses.
   *
   * @param messages The messages from the LLM response.
   * @returns True if the tool call is valid, false otherwise.
   */
  public validate(messages: BaseMessage[]): boolean {
    const names = this.getToolCallNames(messages);
    return this.validateToolCalls(names);
  }

  /**
   * Subclasses must implement this method to define their specific validation logic.
   *
   * @param toolCallNames A list of tool call names extracted from the response.
   */
  protected abstract validateToolCalls(toolCallNames: string[]): boolean;

  /**
   * Extracts the tool call names from AI messages.
   *
   * @param messages The array of messages to process.
   * @returns An array of tool call names.
   */
  private getToolCallNames(messages: BaseMessage[]): string[] {
    const toolCallNames: string[] = [];
    for (const message of messages) {
      if (message.getType() === "ai" && (message as AIMessage).tool_calls) {
        for (const toolCall of (message as AIMessage).tool_calls!) {
          toolCallNames.push(toolCall.name);
        }
      }
    }
    return toolCallNames;
  }
}

/**
 * A generic interface for validating a response from the LLM.
 * The validate method can be synchronous or asynchronous.
 */
export interface Guard {
  validate(messages: BaseMessage[]): Promise<boolean> | boolean;
}
