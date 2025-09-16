export interface RequestHandler {
  execute(request: RequestMessage): Promise<void>;
}

export interface RequestMessage {
  id: string;
  message: {
    requestId: string;
    event: "messageCreate" | "messageDelete";
    instruction: string;
    sender: string;
    /** A JSON string array of usernames. */
    groupMembers: string;
    ledgerId: string;
    channelId: string;
    messageId: string;
  };
}

export interface ResultMessage {
  message: {
    result?: string;
    channelId: string;
    messageId: string;
    requestId: string;
  };
}
