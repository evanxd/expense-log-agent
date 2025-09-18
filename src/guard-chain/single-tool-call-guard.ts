import { BaseToolGuard } from "./base-tool-guard.js";

/**
 * Validator that checks for a single, allowed tool call.
 */
export class SingleToolCallGuard extends BaseToolGuard {
  private allowedToolCalls = new Set([
    this.DELETE_EXPENSE_TOOL_CALL_RESULT,
    this.GET_EXPENSE_TOOL_CALL_RESULT,
    this.GET_GROUPED_EXPENSES_TOOL_CALL_RESULT,
  ]);

  protected validateToolCalls(results: Set<string>): boolean {
    if (results.size !== 1) {
      return false;
    }
    const result = results.values().next().value!;
    return this.allowedToolCalls.has(result);
  }
}
