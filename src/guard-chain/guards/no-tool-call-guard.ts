import { BaseToolGuard } from "./base-tool-guard.js";

/**
 * Validator that checks for the absence of any tool calls.
 *
 * @param toolCallNames A list of tool call names extracted from the response.
 * @returns True if the tool call is valid, false otherwise.
 */
export class NoToolCallGuard extends BaseToolGuard {
  protected validateToolCalls(toolCallNames: string[]): boolean {
    return toolCallNames.length === 0;
  }
}
