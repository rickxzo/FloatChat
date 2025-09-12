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
    // Convert \n into actual newlines and split into points
    const points = chunk
      .split("\\n") // split on escaped \n from backend
      .map((line) => line.trim())
      .filter(Boolean);

    points.forEach((point, i) => {
      setTimeout(() => {
        setSessions((prev) =>
          prev.map((s) => {
            if (s.id !== sessionId) return s;
            const updatedMessages = [...s.messages];
            const msg = updatedMessages[msgIndex];
            if (!msg) return s;

            // Add bullet and newline for pointwise formatting
            const newText = msg.text + `\n- ${point}`;
            updatedMessages[msgIndex] = {
              ...msg,
              text: newText,
              visibleWords: msg.visibleWords
                ? [...msg.visibleWords, point]
                : [point],
            };
            return { ...s, messages: updatedMessages };
          })
        );
      }, i * 50);
    });
  };

  // helper: rename first chat after bot response
  const maybeRenameFirstChat = async (sessionId: string) => {
    const session = sessions.find((s) => s.id === sessionId);
    if (!session) return;

    // first user and first bot messages
    const userMsg = session.messages.find((m) => m.role === "user")?.text;
    const botMsg = session.messages.find((m) => m.role === "model")?.text;

    if (!userMsg || !botMsg) return;

    try {
      const res = await fetch("http://localhost:5000/api/rename", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user: userMsg, bot: botMsg }),
      });
      const data = await res.json();
      const newTitle =
        data.title ||
        (botMsg.length > 30 ? botMsg.slice(0, 30) + "..." : botMsg);

      setSessions((prev) =>
        prev.map((s) => (s.id === sessionId ? { ...s, title: newTitle } : s))
      );
    } catch (err) {
      console.error("Rename failed:", err);
    }
  };

  // Generate bot response (updated for server-side chart generation)
  const generateBotResponse = (id: string, history: ChatMessage[]) => {
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

    let didRename = false; // Track whether rename was already done

    (async () => {
      try {
        if (mode === "study") {
          // For study mode, use direct API call instead of SSE for chart generation
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
          console.log("Study mode response:", result);

          // Handle the response
          setSessions((prev) =>
            prev.map((s) => {
              if (s.id !== id) return s;
              const updatedMessages = [...s.messages];
              if (updatedMessages[modelIndex]) {
                updatedMessages[modelIndex] = {
                  ...updatedMessages[modelIndex],
                  text: result.response || "Chart generated successfully!",
                  plot_url: result.plot_url, // NEW: Add plot URL for server-generated charts
                  toolLogs: result.tool_logs || [],
                  sandbox: false, // No longer using browser sandbox
                  sandbox_code: null,
                };
              }
              return { ...s, messages: updatedMessages };
            })
          );

          // Handle renaming for first message
          if (
            !didRename &&
            history.length === 1 &&
            result.response
          ) {
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
          // --- Normal Chat Mode (Replicate) - keep existing SSE logic ---
          await fetch("http://localhost:5000/api/stream", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              messages: newHistory.map(({ role, text }) => ({
                role: role === "model" ? "assistant" : role, // map "model" → "assistant"
                content: text,
              })),
            }),
            signal: controller.signal,
          });

          const response = await fetch("http://localhost:5000/api/stream", {
            method: "GET",
            signal: controller.signal,
          });

          if (!response.body) throw new Error("SSE connection failed");

          const reader = response.body.getReader();
          const decoder = new TextDecoder("utf-8");
          let finalBotMsg = "";

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split("\n");

            for (let line of lines) {
              if (!line.startsWith("data:")) continue;
              const word = line.replace("data:", "").trim();
              if (!word) continue;

              if (word === "[END]") {
                if (
                  !didRename &&
                  history.length === 1 &&
                  finalBotMsg.trim().length > 0
                ) {
                  didRename = true;
                  const renameRes = await fetch(
                    "http://localhost:5000/api/rename",
                    {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        user: history[0].text,
                        bot: finalBotMsg,
                      }),
                    }
                  );
                  const data = await renameRes.json();
                  const newTitle =
                    data.title ||
                    (finalBotMsg.length > 30
                      ? finalBotMsg.slice(0, 30) + "..."
                      : finalBotMsg);

                  setSessions((prev) =>
                    prev.map((s) =>
                      s.id === id ? { ...s, title: newTitle } : s
                    )
                  );
                }

                delete sseControllers.current[id];
                break;
              }

              finalBotMsg += word + " ";
              appendSSEChunk(id, modelIndex, word + " ");
            }
          }
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

  const updateMessages = (msgs: ChatMessage[]) => {
    setSessions((prev) =>
      prev.map((s) => (s.id === activeSessionId ? { ...s, messages: msgs } : s))
    );
  };

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
          {/* Header */}
          <div className="backdrop-ocean border-b border-blue-400/20 p-4 flex items-center justify-between">
            <div>
              <h1 className="text-ocean-light drop-shadow-lg text-lg font-semibold">
                🌊 OceanBot
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

          {/* Chat interface */}
          {activeSession ? (
            <ChatInterface
              key={activeSession.id}
              session={activeSession}
              updateMessages={(msgs) =>
                updateSessionMessages(activeSession.id, msgs)
              }
              generateBotResponse={(history) =>
                generateBotResponse(activeSession.id, history)
              }
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