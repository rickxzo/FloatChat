import { useState, useEffect, useRef } from "react";
import { ChatInterface } from "./components/ChatInterface";
import { Sidebar } from "./components/Sidebar";
import { BubbleEffect } from "./components/BubbleEffect";
import { OceanBackground } from "./components/OceanBackground";
import { P5Background } from "./components/P5Background";
import type { ChatSession, ChatMessage } from "./types/chat";

export default function App() {
  const [bubbles, setBubbles] = useState<{ id: number; x: number; y: number }[]>([]);
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
    };
    setSessions([newSession, ...sessions]);
    setActiveSessionId(newSession.id);
  };

  const updateSessionMessages = (id: string, messages: ChatMessage[]) => {
    setSessions((prev) => prev.map((s) => (s.id === id ? { ...s, messages } : s)));
  };

  // Append SSE chunk word-by-word with fade
  const appendSSEChunk = (sessionId: string, msgIndex: number, chunk: string) => {
    const words = chunk.split(" ").filter(Boolean);
    words.forEach((word, i) => {
      setTimeout(() => {
        setSessions((prev) =>
          prev.map((s) => {
            if (s.id !== sessionId) return s;

            const updatedMessages = [...s.messages];
            const msg = updatedMessages[msgIndex];
            if (!msg) return s;

            updatedMessages[msgIndex] = {
              ...msg,
              text: msg.text + word + " ",
              visibleWords: msg.visibleWords ? [...msg.visibleWords, word] : [word],
            };

            return { ...s, messages: updatedMessages };
          })
        );
      }, i * 50); // 50ms per word
    });
  };

  // Generate bot response via SSE
  const generateBotResponse = (id: string, history: ChatMessage[]) => {
    if (sseControllers.current[id]) return; // prevent duplicate SSE

    const controller = new AbortController();
    sseControllers.current[id] = { abort: () => controller.abort() };

    // Append placeholder model message
    const newHistory: ChatMessage[] = [
      ...history,
      { role: "model" as const, text: "" },
    ];
    updateSessionMessages(id, newHistory);
    const modelIndex = newHistory.length - 1;

    (async () => {
      try {
        await fetch("http://localhost:5000/api/stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: newHistory.map(({ role, text }) => ({ role, parts: [{ text }] })),
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
              delete sseControllers.current[id];
              break;
            }

            appendSSEChunk(id, modelIndex, word + " ");
          }
        }
      } catch (err: any) {
        updateSessionMessages(id, [
          ...history,
          { role: "model" as const, text: "⚠️ " + err.message, isError: true },
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
    setTimeout(() => setBubbles((prev) => prev.filter((b) => b.id !== newBubble.id)), 1000);
  };

  return (
    <div className="min-h-screen bg-ocean-depth relative overflow-hidden" onClick={handleClick}>
      <OceanBackground />
      <P5Background />
      {bubbles.map((b) => <BubbleEffect key={b.id} x={b.x} y={b.y} />)}

      <div className="flex h-screen relative z-10">
        <Sidebar
          sessions={sessions}
          activeId={activeSessionId}
          onSelect={setActiveSessionId}
          onNewChat={addNewSession}
        />

        <div className="flex-1 flex flex-col">
          <div className="backdrop-ocean border-b border-blue-400/20 p-4">
            <h1 className="text-ocean-light drop-shadow-lg">🌊 OceanBot - Your Oceanography Assistant</h1>
            <p className="text-blue-200/80 text-sm mt-1">
              Explore the depths of ocean science with advanced marine data analysis
            </p>
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
