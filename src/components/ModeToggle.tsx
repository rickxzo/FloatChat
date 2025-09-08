import { BookOpen, MessageCircle } from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";

interface ModeToggleProps {
  mode: "normal" | "study";
  setMode: (mode: "normal" | "study") => void;
}

export function ModeToggle({ mode, setMode }: ModeToggleProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex bg-blue-900/60 backdrop-blur-sm rounded-full p-1 border border-blue-500/30">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setMode("normal")}
          className={`rounded-full px-4 py-2 transition-all duration-200 ${
            mode === "normal"
              ? "bg-blue-500 text-white shadow-lg shadow-blue-500/25"
              : "text-blue-200 hover:text-white hover:bg-blue-800/50"
          }`}
        >
          <MessageCircle className="w-4 h-4 mr-2" />
          Chat Mode
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setMode("study")}
          className={`rounded-full px-4 py-2 transition-all duration-200 ${
            mode === "study"
              ? "bg-cyan-500 text-white shadow-lg shadow-cyan-500/25"
              : "text-blue-200 hover:text-white hover:bg-blue-800/50"
          }`}
        >
          <BookOpen className="w-4 h-4 mr-2" />
          Study Mode
        </Button>
      </div>

      <Badge
        variant="secondary"
        className={`${
          mode === "normal"
            ? "bg-blue-500/20 text-blue-200 border-blue-400/30"
            : "bg-cyan-500/20 text-cyan-200 border-cyan-400/30"
        } backdrop-blur-sm`}
      >
        {mode === "normal" ? "Interactive Chat" : "Research & Analysis"}
      </Badge>
    </div>
  );
}
