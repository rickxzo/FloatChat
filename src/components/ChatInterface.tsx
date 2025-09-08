import { useRef, useEffect, useState } from "react";
import type { ChatSession, ChatMessage } from "../types/chat";

interface ChatInterfaceProps {
  session: ChatSession;
  updateMessages: (msgs: ChatMessage[]) => void;
  generateBotResponse: (history: ChatMessage[]) => void;
}

function formatBotMessage(text: string) {
  if (!text) return null;

  // Keep lines, including empty lines
  const lines = text.split("\n");

  const renderWithBold = (line: string) => {
    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) =>
      part.startsWith("**") && part.endsWith("**") ? (
        <strong key={i} className="font-semibold">
          {part.slice(2, -2)}
        </strong>
      ) : (
        <span key={i}>{part}</span>
      )
    );
  };

  const isNumbered = lines.some((l) => /^\s*\d+\./.test(l));
  const isBulleted = lines.some((l) => /^\s*[-•]/.test(l));

  if (isNumbered || isBulleted) {
    return (
      <ul className="list-disc list-inside space-y-1">
        {lines.map((line, i) => (
          <li key={i} className="whitespace-pre-wrap">
            {renderWithBold(line.replace(/^\s*[\d\-\•\.]*\s*/, ""))}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="space-y-2">
      {lines.map((line, i) => (
        <p key={i} className="whitespace-pre-wrap">
          {renderWithBold(line)}
        </p>
      ))}
    </div>
  );
}

// Helper function to format individual words with bold support
function formatWord(word: string, wordIndex: number) {
  // Check if this word contains bold formatting
  const parts = word.split(/(\*\*[^*]+\*\*)/g);

  return parts.map((part, partIndex) => {
    const key = `${wordIndex}-${partIndex}`;
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={key} className="font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={key}>{part}</span>;
  });
}

export function ChatInterface({
  session,
  updateMessages,
  generateBotResponse,
}: ChatInterfaceProps) {
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
        className="flex-1 overflow-y-auto p-6 space-y-6 bg-gradient-to-b from-blue-50/5 to-blue-900/10"
      >
        {session.messages.map((msg, i) => {
          const isUser = msg.role === "user";
          return (
            <div
              key={i}
              className={`flex flex-col ${
                isUser ? "items-end" : "items-start"
              } space-y-2`}
            >
              {/* Message bubble */}
              <div
                className={`relative px-4 py-2 rounded-2xl max-w-[75%] shadow-md ${
                  isUser
                    ? "bg-blue-600 text-white rounded-br-none"
                    : msg.isError
                    ? "bg-red-200 text-red-800 rounded-bl-none"
                    : "bg-white text-blue-900 rounded-bl-none border border-blue-100"
                }`}
              >
                {/* Message text with word fade-in and bold support */}
                {!isUser && msg.text && (
                  <>
                    {msg.visibleWords
                      ? msg.visibleWords.map((word, idx) => (
                          <span
                            key={idx}
                            className="inline-block opacity-0 animate-fade-in mr-1"
                            style={{ animationDelay: `${idx * 50}ms` }}
                          >
                            {formatWord(word, idx)}
                          </span>
                        ))
                      : formatBotMessage(msg.text)}
                  </>
                )}

                {isUser && <span>{msg.text}</span>}

                {/* Bubble tail */}
                <div
                  className={`absolute w-0 h-0 border-t-[8px] border-t-transparent ${
                    isUser
                      ? "right-0 bottom-0 border-l-[12px] border-l-blue-600"
                      : msg.isError
                      ? "left-0 bottom-0 border-r-[12px] border-r-red-200"
                      : "left-0 bottom-0 border-r-[12px] border-r-white"
                  }`}
                />
              </div>

              {/* Server-generated chart display */}
              {!isUser && msg.plot_url && (
                <div className="max-w-[75%] w-full">
                  <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-xl shadow-lg border border-blue-200">
                    <div className="mb-2">
                      <h3 className="text-lg font-semibold text-blue-800 flex items-center">
                        📊 Generated Chart
                      </h3>
                    </div>
                    <div className="chart-container bg-white p-2 rounded-lg shadow-inner">
                      <img 
                        src={`http://localhost:5000${msg.plot_url}?t=${Date.now()}`}
                        alt="Generated Chart" 
                        className="max-w-full h-auto rounded-lg shadow-md"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iI2Y5ZjlmOSIgc3Ryb2tlPSIjZGRkIiBzdHJva2Utd2lkdGg9IjIiLz4KICA8dGV4dCB4PSIyMDAiIHk9IjE1MCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjE2IiBmaWxsPSIjNjY2Ij5DaGFydCBub3QgYXZhaWxhYmxlPC90ZXh0Pgo8L3N2Zz4K";
                        }}
                        onLoad={() => {
                          console.log("Chart loaded successfully");
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Sandbox output (keep for backward compatibility but won't be used) */}
              {!isUser && msg.sandbox && msg.sandbox_code && !msg.plot_url && (
                <div className="max-w-[75%] w-full">
                  <div className="p-4 bg-yellow-100 rounded-lg border border-yellow-300">
                    <p className="text-sm text-yellow-800">
                      Note: This chat is now using server-side chart generation. 
                      Please refresh if you're seeing this message.
                    </p>
                  </div>
                </div>
              )}

              {/* Tool logs / sources */}
              {msg.role === "model" &&
                msg.toolLogs &&
                msg.toolLogs.length > 0 && (
                  <div className="mt-2 ml-2 p-3 text-sm rounded-xl bg-gray-50/80 text-gray-800 border border-gray-300 max-w-[75%] shadow-sm">
                    <details>
                      <summary className="cursor-pointer font-medium text-blue-600">
                        Sources / Tool Logs
                      </summary>
                      <ul className="mt-1 list-disc list-inside space-y-1">
                        {msg.toolLogs.map((log, idx) => (
                          <li key={idx}>
                            <span className="font-semibold">{log.name}:</span>
                            <ul className="list-disc list-inside ml-4 mt-1">
                              {log.output.split("\n").map((line, lineIdx) => (
                                <li
                                  key={lineIdx}
                                  className="whitespace-pre-wrap"
                                >
                                  {line}
                                </li>
                              ))}
                            </ul>
                          </li>
                        ))}
                      </ul>
                    </details>
                  </div>
                )}
            </div>
          );
        })}
      </div>

      {/* Input area */}
      <div className="p-4 border-t flex items-center space-x-2 bg-white/10 backdrop-blur-md">
        <input
          name="message"
          type="text"
          placeholder="Type a message..."
          className="flex-1 p-3 rounded-xl border border-blue-300/30 bg-white/80 focus:ring-2 focus:ring-blue-400 focus:outline-none"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
          required
        />
        <button
          type="button"
          onClick={handleSubmit}
          className="px-5 py-2 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 transition"
        >
          Send
        </button>
      </div>
    </div>
  );
}