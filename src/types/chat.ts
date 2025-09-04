export interface ChatMessage {
  role: "user" | "model";
  text: string;
  visibleWords?: string[];
  isError?: boolean;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  timestamp: number;
}
