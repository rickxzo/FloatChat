import { useRef, useEffect, useState } from "react";
import type { ChatSession, ChatMessage } from "../types/chat";

interface ChatInterfaceProps {
  session: ChatSession;
  updateMessages: (msgs: ChatMessage[]) => void;
  generateBotResponse: (history: ChatMessage[]) => void;
}

export function ChatInterface({ session, updateMessages, generateBotResponse }: ChatInterfaceProps) {
  const chatBodyRef = useRef<HTMLDivElement>(null);
  const [inputValue, setInputValue] = useState("");

  // Auto-scroll when messages change
  useEffect(() => {
    chatBodyRef.current?.scrollTo({
      top: chatBodyRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [session.messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputValue.trim();
    if (!trimmed) return;

    const newHistory: ChatMessage[] = [
      ...session.messages,
      { role: "user" as const, text: trimmed },
    ];

    updateMessages(newHistory);
    generateBotResponse(newHistory);
    setInputValue("");
  };

  return (
    <div className="flex flex-col flex-1 h-full overflow-hidden">
      {/* Chat body */}
      <div
        ref={chatBodyRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 rounded-lg"
      >
        {session.messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <span
              className={`px-3 py-2 rounded-lg max-w-[75%] flex flex-wrap ${
                msg.role === "user"
                  ? "bg-blue-600 text-white"
                  : msg.isError
                  ? "bg-red-200 text-red-800"
                  : "bg-blue-100 text-blue-900"
              }`}
            >
              {msg.visibleWords
                ? msg.visibleWords.map((word, idx) => (
                    <span
                      key={idx}
                      className="inline-block opacity-0 animate-fade-in mr-1"
                      style={{ animationDelay: `${idx * 50}ms` }}
                    >
                      {word}
                    </span>
                  ))
                : msg.text}
            </span>
          </div>
        ))}
      </div>

      {/* Input area */}
      <form
        onSubmit={handleSubmit}
        className="p-4 border-t flex items-center space-x-2 bg-white/10 backdrop-blur-md"
      >
        <input
          name="message"
          type="text"
          placeholder="Type a message..."
          className="flex-1 p-2 rounded-lg border focus:ring-2 focus:ring-blue-400"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          required
        />
        <button
          type="submit"
          className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition"
        >
          Send
        </button>
      </form>
    </div>
  );
}
