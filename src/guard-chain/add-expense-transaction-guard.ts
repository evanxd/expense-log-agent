import { BaseToolGuard } from "./base-tool-guard.js";

/**
 * Validator that enforces a transactional relationship between `addExpense` and `getExpenseCategories`.
 */
export class AddExpenseTransactionGuard extends BaseToolGuard {
  protected validateToolCalls(results: Set<string>): boolean {
    const requiredResults = new Set([
      this.GET_EXPENSE_CATEGORIES_TOOL_CALL_RESULT,
      this.ADD_EXPENSE_TOOL_CALL_RESULT
    ]);
    return requiredResults.size === results.size &&
      [...requiredResults].every(result => results.has(result));
  }
}
