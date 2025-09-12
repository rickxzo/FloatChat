import { useState, useEffect, useRef } from "react";
import { ChatInterface } from "./components/ChatInterface";
import { Sidebar } from "./components/Sidebar";
import { BubbleEffect } from "./components/BubbleEffect";
import { OceanBackground } from "./components/OceanBackground";
import { P5Background } from "./components/P5Background";
import { ModeToggle } from "./components/ModeToggle";
import type { ChatSession, ChatMessage } from "./types/chat";
import { FishBackground } from "./components/FishBackground";

export default function App() {
  const [bubbles, setBubbles] = useState<
    { id: number; x: number; y: number }[]
  >([]);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  // SSE controllers per session
  const sseControllers = useRef<Record<string, { abort: () => void }>>({});

  useEffect(() => {
    const stored = localStorage.getItem("chat-sessions");
    if (stored) {
      const parsed: ChatSession[] = JSON.parse(stored);
      setSessions(parsed);
      if (parsed.length > 0) setActiveSessionId(parsed[0].id);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("chat-sessions", JSON.stringify(sessions));
  }, [sessions]);

  const addNewSession = () => {
    const newSession: ChatSession = {
      id: Date.now().toString(),
      title: "New Chat",
      messages: [],
      timestamp: Date.now(),
      mode: "chat",
    };
    setSessions([newSession, ...sessions]);
    setActiveSessionId(newSession.id);
  };

  const updateSessionMessages = (id: string, messages: ChatMessage[]) => {
    setSessions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, messages } : s))
    );
  };

  const appendSSEChunk = (
    sessionId: string,
    msgIndex: number,
    chunk: string
  ) => {
    setSessions((prev) =>
      prev.map((s) => {
        if (s.id !== sessionId) return s;
        const updatedMessages = [...s.messages];
        const msg = updatedMessages[msgIndex];
        if (!msg) return s;

        updatedMessages[msgIndex] = {
          ...msg,
          text: msg.text + chunk,
          visibleWords: msg.visibleWords 
            ? [...msg.visibleWords, chunk.trim()]
            : [chunk.trim()], // 🎯 Add word to visibleWords array
        };
        return { ...s, messages: updatedMessages };
      })
    );
  };

  // Helper function to fetch image when ANIMGT is detected
  const fetchGeneratedImage = async (sessionId: string, messageIndex: number) => {
    try {
      console.log("Fetching image from /img endpoint...");
      
      const response = await fetch("http://127.0.0.1:10000/img");
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log("Image response received");
      
      if (data.image) {
        console.log("Setting image_url in message...");
        setSessions((prev) =>
          prev.map((s) => {
            if (s.id !== sessionId) return s;
            const updatedMessages = [...s.messages];
            if (updatedMessages[messageIndex]) {
              updatedMessages[messageIndex] = {
                ...updatedMessages[messageIndex],
                image_url: data.image
              };
            }
            return { ...s, messages: updatedMessages };
          })
        );
      }
    } catch (error) {
      console.error("Failed to fetch generated image:", error);
    }
  };

  // Generate bot response
  const generateBotResponse = (id: string | null, history: ChatMessage[]) => {
    if (!id) {
      console.error("No active session id. Aborting generateBotResponse.");
      return;
    }
    
    if (sseControllers.current[id]) return;

    const controller = new AbortController();
    sseControllers.current[id] = { abort: () => controller.abort() };

    const session = sessions.find((s) => s.id === id);
    const mode = session?.mode || "chat";

    const newHistory: ChatMessage[] = [
      ...history,
      { role: "model" as const, text: "" },
    ];
    updateSessionMessages(id, newHistory);
    const modelIndex = newHistory.length - 1;

    let didRename = false;

    (async () => {
      try {
        if (mode === "study") {
          // Study mode logic remains the same
          const response = await fetch("http://localhost:5000/api/study", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              message: history[history.length - 1].text,
            }),
            signal: controller.signal,
          });

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const result = await response.json();

          setSessions((prev) =>
            prev.map((s) => {
              if (s.id !== id) return s;
              const updatedMessages = [...s.messages];
              if (updatedMessages[modelIndex]) {
                updatedMessages[modelIndex] = {
                  ...updatedMessages[modelIndex],
                  text: result.response || "Chart generated successfully!",
                  plot_url: result.plot_url,
                  toolLogs: result.tool_logs || [],
                  sandbox: false,
                  sandbox_code: null,
                };
              }
              return { ...s, messages: updatedMessages };
            })
          );

          if (!didRename && history.length === 1 && result.response) {
            didRename = true;
            try {
              const renameRes = await fetch("http://localhost:5000/api/rename", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  user: history[0].text,
                  bot: result.response,
                  mode: "study",
                }),
              });
              const renameData = await renameRes.json();
              const newTitle = renameData.title || "New Study Chat";

              setSessions((prev) =>
                prev.map((s) => (s.id === id ? { ...s, title: newTitle } : s))
              );
            } catch (renameError) {
              console.error("Rename error:", renameError);
            }
          }

          delete sseControllers.current[id];

        } else {
          // Normal Chat Mode with proper ANIMGT handling
          await fetch("http://127.0.0.1:10000/respond", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              messages: newHistory.map(({ role, text }) => ({
                role: role === "model" ? "assistant" : role,
                content: text,
              })),
            }),
            signal: controller.signal,
          });

          const response = await fetch("http://127.0.0.1:10000/respond", {
            method: "GET",
            signal: controller.signal,
          });

          if (!response.body) throw new Error("SSE connection failed");

          const reader = response.body.getReader();
          const decoder = new TextDecoder("utf-8");
          let fullBotMessage = "";

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split("\n");

            for (let line of lines) {
              if (!line.startsWith("data:")) continue;
              const word = line.replace("data:", "").trim();
              if (!word) continue;

              fullBotMessage += word + " ";
              appendSSEChunk(id, modelIndex, word + " ");
            }
          }

          // After streaming is complete, check for ANIMGT
          console.log("Full bot message:", fullBotMessage);
          
          if (fullBotMessage.includes("ANIMGT")) {
            console.log("ANIMGT detected! Cleaning message and fetching image...");
            
            // Clean the message by removing ANIMGT
            const cleanedMessage = fullBotMessage.replace(/ANIMGT\s*/g, "").trim();
            
            setSessions((prev) =>
              prev.map((s) => {
                if (s.id !== id) return s;
                const updatedMessages = [...s.messages];
                if (updatedMessages[modelIndex]) {
                  updatedMessages[modelIndex] = {
                    ...updatedMessages[modelIndex],
                    text: cleanedMessage,
                  };
                }
                return { ...s, messages: updatedMessages };
              })
            );

            // Fetch the generated image
            await fetchGeneratedImage(id, modelIndex);
          }

          // Handle renaming for first chat
          if (!didRename && history.length === 1 && fullBotMessage.trim().length > 0) {
            didRename = true;
            const cleanedForTitle = fullBotMessage.replace(/ANIMGT\s*/g, "").trim();
            const newTitle = cleanedForTitle.length > 30 
              ? cleanedForTitle.slice(0, 30) + "..." 
              : cleanedForTitle;

            setSessions((prev) =>
              prev.map((s) =>
                s.id === id ? { ...s, title: newTitle } : s
              )
            );
          }

          delete sseControllers.current[id];
        }
      } catch (err: any) {
        console.error("Bot response error:", err);
        updateSessionMessages(id, [
          ...history,
          { 
            role: "model" as const, 
            text: "⚠️ " + err.message, 
            isError: true 
          },
        ]);
      } finally {
        delete sseControllers.current[id];
      }
    })();
  };

  const activeSession = sessions.find((s) => s.id === activeSessionId);

  const handleClick = (e: React.MouseEvent) => {
    const newBubble = { id: Date.now(), x: e.clientX, y: e.clientY };
    setBubbles((prev) => [...prev, newBubble]);
    setTimeout(
      () => setBubbles((prev) => prev.filter((b) => b.id !== newBubble.id)),
      1000
    );
  };

  return (
    <div
      className="min-h-screen bg-ocean-depth relative overflow-hidden"
      onClick={handleClick}
    >
      <OceanBackground />
      <P5Background />
      <FishBackground />
      {bubbles.map((b) => (
        <BubbleEffect key={b.id} x={b.x} y={b.y} />
      ))}

      <div className="flex h-screen relative z-10">
        <Sidebar
          sessions={sessions}
          activeId={activeSessionId}
          onSelect={setActiveSessionId}
          onNewChat={addNewSession}
        />

        <div className="flex-1 flex flex-col">
          <div className="backdrop-ocean border-b border-blue-400/20 p-4 flex items-center justify-between">
            <div>
              <h1 className="text-ocean-light drop-shadow-lg text-lg font-semibold">
                🌊 FloatChat
              </h1>
              <p className="text-blue-200/80 text-sm">
                Explore the depths of ocean science
              </p>
            </div>
            {activeSession && (
              <ModeToggle
                mode={activeSession.mode === "study" ? "study" : "normal"}
                setMode={(m) => {
                  if (activeSessionId) {
                    setSessions((prev) =>
                      prev.map((s) =>
                        s.id === activeSessionId
                          ? { ...s, mode: m === "study" ? "study" : "chat" }
                          : s
                      )
                    );
                  }
                }}
              />
            )}
          </div>

          {activeSession ? (
            <ChatInterface
              key={activeSession.id}
              session={activeSession}
              updateMessages={(msgs) => updateSessionMessages(activeSession.id, msgs)}
              generateBotResponse={(history) => generateBotResponse(activeSession.id, history)}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              Select or start a chat
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
