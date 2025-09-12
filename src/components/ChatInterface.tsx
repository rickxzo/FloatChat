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

              {/* Chart display - FIXED VERSION */}
              {!isUser && (msg.plot_url || msg.image_url) && (
              <div className="max-w-[75%] w-full">
                <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-xl shadow-lg border border-blue-200">
                  <div className="mb-2">
                    <h3 className="text-lg font-semibold text-blue-800 flex items-center">
                      📊 Generated Chart
                    </h3>
                  </div>
                  <div className="chart-container bg-white p-2 rounded-lg shadow-inner">
                    <ChartImage 
                      src={msg.plot_url || msg.image_url || "http://localhost:5000/img"} 
                      messageIndex={i} 
                    />
                  </div>
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

// Separate component for chart image with better error handling and retry logic
// Updated ChartImage component for base64 image handling
function ChartImage({ src, messageIndex }: { src: string; messageIndex: number }) {
  const [imageData, setImageData] = useState<string>("");
  const [hasError, setHasError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Function to fetch base64 image data
  const fetchImageData = async () => {
    try {
      setIsLoading(true);
      setHasError(false);
      
      const response = await fetch(src);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const base64Data = await response.text();
      
      // Check if the response is a valid base64 data URL
      if (base64Data.startsWith('data:image/')) {
        setImageData(base64Data);
        setIsLoading(false);
        console.log("Base64 image loaded successfully");
      } else if (base64Data.length > 0) {
        // If it's raw base64, add the data URL prefix
        const formattedData = `data:image/png;base64,${base64Data}`;
        setImageData(formattedData);
        setIsLoading(false);
        console.log("Raw base64 converted to data URL");
      } else {
        throw new Error("Empty response from server");
      }
      
    } catch (error) {
      console.error(`Failed to fetch base64 image (attempt ${retryCount + 1}):`, error);
      setIsLoading(false);
      
      if (retryCount < 2) {
        // Retry with exponential backoff
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
          fetchImageData();
        }, 1000 * (retryCount + 1));
      } else {
        setHasError(true);
      }
    }
  };

  // Initial load and setup retry mechanism
  useEffect(() => {
    setRetryCount(0);
    fetchImageData();
  }, [src, messageIndex]);

  // Manual retry function
  const handleRetry = () => {
    setRetryCount(0);
    fetchImageData();
  };

  const handleImageLoad = () => {
    console.log("Base64 image rendered successfully");
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    console.error("Base64 image rendering failed:", e);
    setHasError(true);
  };

  return (
    <div className="relative min-h-[200px] flex items-center justify-center">
      {isLoading && !hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50 rounded-lg">
          <div className="flex flex-col items-center space-y-2">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="text-sm text-gray-600">
              {retryCount > 0 ? `Retrying... (${retryCount + 1}/3)` : "Loading chart..."}
            </span>
          </div>
        </div>
      )}
      
      {hasError ? (
        <div className="flex flex-col items-center space-y-4 p-8 text-center">
          <div className="text-4xl">📊</div>
          <div className="space-y-2">
            <p className="text-gray-600">Chart generation completed but display failed</p>
            <p className="text-sm text-gray-500">
              The chart was created successfully on the server but couldn't be displayed here.
            </p>
          </div>
          <div className="space-x-2">
            <button
              onClick={handleRetry}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm"
            >
              Retry
            </button>
            <a
              href={src}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition text-sm"
            >
              View Direct
            </a>
          </div>
        </div>
      ) : imageData ? (
        <img 
          src={imageData}
          alt="Generated Chart" 
          className="max-w-full h-auto rounded-lg shadow-md transition-opacity duration-300"
          onLoad={handleImageLoad}
          onError={handleImageError}
        />
      ) : null}
    </div>
  );
}
