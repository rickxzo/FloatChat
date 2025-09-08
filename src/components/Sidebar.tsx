// Sidebar.tsx
import { useState } from "react";
import { Button } from "./ui/button";
import {
  PlusCircle,
  MessageCircle,
  Waves,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Beaker,
} from "lucide-react";
import type { ChatSession } from "../types/chat";

interface SidebarProps {
  sessions: ChatSession[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNewChat: () => void;
}

export function Sidebar({ sessions, activeId, onSelect, onNewChat }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div
      className={`bg-blue-900/80 backdrop-blur-md border-r border-blue-700/30 transition-all duration-300 ${
        isCollapsed ? "w-16" : "w-80"
      } flex flex-col`}
    >
      {/* Header */}
      <div className="p-4 border-b border-blue-700/30">
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <div className="flex items-center gap-2">
              <Waves className="w-6 h-6 text-blue-300" />
              <span className="text-white font-medium">Ocean Chats</span>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="text-blue-300 hover:text-white hover:bg-blue-800/50"
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </Button>
        </div>

        {!isCollapsed && (
          <Button
            className="w-full mt-3 bg-blue-600 hover:bg-blue-500 text-white"
            onClick={onNewChat}
          >
            <PlusCircle className="w-4 h-4 mr-2" />
            New Chat
          </Button>
        )}
      </div>

      {/* Chat History */}
      <div className="flex-1 overflow-y-auto p-2">
        {sessions.map((chat) => {
          // Dynamic title: use first user message if exists, otherwise fallback
          // Dynamic title: use renamed title if exists
          const dynamicTitle =
            chat.title ||
            chat.messages.find((m) => m.role === "user")?.text.slice(0, 40) ||
            "New Chat";



          return (
            <div
              key={chat.id}
              onClick={() => onSelect(chat.id)}
              className={`p-3 mb-2 rounded-lg cursor-pointer transition-colors group ${
                chat.id === activeId
                  ? "bg-blue-700/50 text-white"
                  : "hover:bg-blue-800/40 text-blue-200"
              }`}
            >
              <div className="flex items-start gap-3">
                <MessageCircle className="w-4 h-4 text-blue-400 mt-1 flex-shrink-0" />
                {!isCollapsed && (
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate group-hover:text-blue-100">
                      {dynamicTitle}
                    </p>
                    <p className="text-xs text-blue-300">
                      {new Date(chat.timestamp).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>

              {!isCollapsed && (
                <div className="mt-1 flex items-center gap-2 text-xs">
                  {chat.mode === "study" ? (
                    <BookOpen size={14} className="text-cyan-400" />
                  ) : (
                    <Beaker size={14} className="text-purple-400" />
                  )}
                  <span className="truncate text-gray-200">
                    {chat.mode === "study" ? "Study Mode" : "Chat Mode"}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-blue-700/30">
        {!isCollapsed && (
          <div className="text-xs text-blue-300 text-center">
            🐠 Dive deep into ocean science
          </div>
        )}
      </div>
    </div>
  );
}
