export type MessageRole = "user" | "model";

export interface ChatMessage {
  role: MessageRole;
  text: string;
}
