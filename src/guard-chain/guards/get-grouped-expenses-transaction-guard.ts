import { BaseToolGuard } from "./base-tool-guard.js";

/**
 * Validator that enforces a transactional relationship between the `get_grouped_expenses` and `get_expense_categories` tools.
 *
 * @param toolCallNames A list of tool call names extracted from the response.
 * @returns True if the tool call is valid, false otherwise.
 */
export class GetGroupedExpensesTransactionGuard extends BaseToolGuard {
  protected validateToolCalls(toolCallNames: string[]): boolean {
    const getExpenseCategoriesCount = toolCallNames.filter(
      (name) => name === this.GET_EXPENSE_CATEGORIES_TOOL_NAME,
    ).length;
    const getGroupedExpensesCount = toolCallNames.filter(
      (name) => name === this.GET_GROUPED_EXPENSES_TOOL_NAME,
    ).length;

    return (
      toolCallNames.length === 2 &&
      getExpenseCategoriesCount === 1 &&
      getGroupedExpensesCount === 1
    );
  }
}
