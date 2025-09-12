import { useRef, useEffect, useState } from "react";
import type { ChatSession, ChatMessage } from "../types/chat";

interface ChatInterfaceProps {
  session: ChatSession;
  updateMessages: (msgs: ChatMessage[]) => void;
  generateBotResponse: (history: ChatMessage[]) => void;
}

function formatBotMessage(text: string, visibleWords?: string[]) {
  if (!visibleWords) {
    // Fallback for completed messages
    return <span>{text}</span>;
  }

  return (
    <span>
      {visibleWords.map((word, i) => (
        <span key={i} className="animate-fade-in">
          {word}{" "}
        </span>
      ))}
    </span>
  );
}

export function ChatInterface({
  session,
  updateMessages,
  generateBotResponse,
}: ChatInterfaceProps) {
  const chatBodyRef = useRef<HTMLDivElement>(null);
  const [inputValue, setInputValue] = useState("");

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
      { role: "user", text: trimmed },
    ];

    updateMessages(newHistory);
    generateBotResponse(newHistory);
    setInputValue("");
  };

  return (
    <div className="flex flex-col flex-1 h-full overflow-hidden">
      <div
        ref={chatBodyRef}
        className="flex-1 overflow-y-auto p-6 space-y-6 bg-gradient-to-b from-blue-50/5 to-blue-900/10"
      >
        {session.messages.map((msg, i) => {
          const isUser = msg.role === "user";

          return (
            <div key={i} className={`flex flex-col ${isUser ? "items-end" : "items-start"} space-y-3`}>
              {/* Message bubble */}
              <div className={`relative px-4 py-3 rounded-2xl max-w-[75%] shadow-md ${
                isUser
                  ? "bg-blue-600 text-white rounded-br-none"
                  : msg.isError
                  ? "bg-red-200 text-red-800 rounded-bl-none"
                  : "bg-white text-blue-900 rounded-bl-none border border-blue-100"
              }`}>
                <div className="whitespace-pre-wrap">
                  {formatBotMessage(msg.text, msg.visibleWords)} 
                </div>

                {/* Message tail */}
                <div className={`absolute w-0 h-0 border-t-[8px] border-t-transparent ${
                  isUser
                    ? "right-0 bottom-0 border-l-[12px] border-l-blue-600"
                    : msg.isError
                    ? "left-0 bottom-0 border-r-[12px] border-r-red-200"
                    : "left-0 bottom-0 border-r-[12px] border-r-white"
                }`} />
              </div>

              {/* Image display - only show if image_url exists */}
              {!isUser && msg.image_url && (
                <div className="max-w-[75%] w-full">
                  <div className="p-4 bg-white/90 rounded-xl shadow-lg border border-blue-200 backdrop-blur-sm">
                    <div className="mb-2">
                      <span className="text-sm font-medium text-blue-800">📊 Generated Visualization</span>
                    </div>
                    <img 
                      src={msg.image_url} 
                      alt="Generated Chart" 
                      className="max-w-full h-auto rounded-lg border border-blue-100 shadow-sm"
                      onError={(e) => {
                        console.error("Image failed to load:", msg.image_url);
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Input area */}
      <div className="p-4 border-t border-blue-400/20 bg-white/10 backdrop-blur-md">
        <form onSubmit={handleSubmit} className="flex items-center space-x-3">
          <input
            name="message"
            type="text"
            placeholder="Ask about ocean data, ARGO floats, or request analysis..."
            className="flex-1 p-3 rounded-xl border border-blue-300/30 bg-white/80 focus:ring-2 focus:ring-blue-400 focus:outline-none transition-all duration-200 focus:bg-white/90"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            required
          />
          <button
            type="submit"
            disabled={!inputValue.trim()}
            className="px-6 py-3 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:shadow-lg"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
