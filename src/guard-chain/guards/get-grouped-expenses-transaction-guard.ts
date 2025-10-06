import { BaseToolGuard } from "./base-tool-guard.js";

/**
 * Validator that enforces a transactional relationship between the `get_grouped_expenses` and `get_expense_categories` tools.
 */
export class GetGroupedExpensesTransactionGuard extends BaseToolGuard {
  protected validateToolCalls(results: Set<string>): boolean {
    const requiredResults = new Set([
      this.GET_EXPENSE_CATEGORIES_TOOL_CALL_RESULT,
      this.GET_GROUPED_EXPENSES_TOOL_CALL_RESULT,
    ]);
    return (
      requiredResults.size === results.size &&
      [...requiredResults].every((result) => results.has(result))
    );
  }
}
