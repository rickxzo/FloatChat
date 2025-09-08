export interface ChatMessage {
  role: "user" | "model";
  text: string;
  visibleWords?: string[];
  isError?: boolean;
  toolLogs?: { name: string; output: string }[];
  sandbox?: boolean;
  sandbox_code?: string | null;
  plot_url?: string;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  timestamp: number;
  mode?: "chat" | "study"; 
}
