import { RedisClientType } from "redis";
import { SwiftAgent } from "swift-agent";

import { GeneralCaseHandler } from "./general-case-handler.js";
import { DeletionHandler } from "./deletion-handler.js";

export function createHandler(event: string, agent: SwiftAgent, client: RedisClientType):
  DeletionHandler | GeneralCaseHandler {
  switch (event) {
    case "messageDelete":
      return new DeletionHandler(agent, client);
    case "messageCreate":
    default:
      return new GeneralCaseHandler(agent, client);
  }
}
