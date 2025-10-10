import { BaseMessage } from "@langchain/core/messages";

import { AddExpenseTransactionGuard } from "./guards/add-expense-transaction-guard.js";
import { GetGroupedExpensesTransactionGuard } from "./guards/get-grouped-expenses-transaction-guard.js";
import { NoToolCallGuard } from "./guards/no-tool-call-guard.js";
import { SingleToolCallGuard } from "./guards/single-tool-call-guard.js";
import { Guard } from "./guards/base-tool-guard.js";

/**
 * Main validator class that uses a set of strategies to validate LLM responses.
 * The response is valid if it matches ANY of the registered validation strategies.
 */
export class GuardChain {
  private guards: Guard[];

  constructor() {
    this.guards = [
      new AddExpenseTransactionGuard(),
      new GetGroupedExpensesTransactionGuard(),
      new NoToolCallGuard(),
      new SingleToolCallGuard(),
    ];
  }

  /**
   * Checks if the messages from an LLM response are valid by testing against a list of guards.
   *
   * @param messages The array of BaseMessage from the LLM.
   * @returns A promise that resolves to true if the tool call configuration is valid, false otherwise.
   */
  public async isValid(messages: BaseMessage[]): Promise<boolean> {
    if (messages.length === 0) {
      return false;
    }
    for (const guard of this.guards) {
      if (await guard.validate(messages)) {
        return true;
      }
    }
    return false;
  }
}
