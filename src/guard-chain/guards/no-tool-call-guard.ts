import { BaseToolGuard } from "./base-tool-guard.js";

/**
 * Validator that checks for the absence of any tool calls.
 */
export class NoToolCallGuard extends BaseToolGuard {
  protected validateToolCalls(results: Set<string>): boolean {
    return results.size === 0;
  }
}
