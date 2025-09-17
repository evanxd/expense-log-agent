import { BaseMessage } from "@langchain/core/messages";

/**
 * A generic interface for validating a response from the LLM.
 * The validate method can be synchronous or asynchronous.
 */
export interface Guard {
  validate(messages: BaseMessage[]): Promise<boolean> | boolean;
}
