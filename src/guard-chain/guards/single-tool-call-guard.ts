import { BaseToolGuard } from "./base-tool-guard.js";

/**
 * Validator that checks for a single, allowed tool call.
 *
 * @param toolCallNames A list of tool call names extracted from the response.
 * @returns True if the tool call is valid, false otherwise.
 */
export class SingleToolCallGuard extends BaseToolGuard {
  protected validateToolCalls(toolCallNames: string[]): boolean {
    const deleteExpenseCount = toolCallNames.filter(
      (name) => name === this.DELETE_EXPENSE_TOOL_NAME,
    ).length;
    const getExpenseCount = toolCallNames.filter(
      (name) => name === this.GET_EXPENSE_TOOL_NAME,
    ).length;
    const getGroupedExpensesCount = toolCallNames.filter(
      (name) => name === this.GET_GROUPED_EXPENSES_TOOL_NAME,
    ).length;

    return (
      toolCallNames.length === 1 &&
      (deleteExpenseCount === 1 ||
        getExpenseCount === 1 ||
        getGroupedExpensesCount === 1)
    );
  }
}
