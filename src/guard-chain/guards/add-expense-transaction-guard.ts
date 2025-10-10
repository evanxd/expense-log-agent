import { BaseToolGuard } from "./base-tool-guard.js";

/**
 * Validator that enforces a transactional relationship between the `add_expense` and `get_expense_categories` tools.
 *
 * @param toolCallNames A list of tool call names extracted from the response.
 * @returns True if the tool call is valid, false otherwise.
 */
export class AddExpenseTransactionGuard extends BaseToolGuard {
  protected validateToolCalls(toolCallNames: string[]): boolean {
    const addExpenseCount = toolCallNames.filter(
      (name) => name === this.ADD_EXPENSE_TOOL_NAME,
    ).length;
    const getCategoriesCount = toolCallNames.filter(
      (name) => name === this.GET_EXPENSE_CATEGORIES_TOOL_NAME,
    ).length;

    return (
      toolCallNames.length === 2 &&
      addExpenseCount === 1 &&
      getCategoriesCount === 1
    );
  }
}
