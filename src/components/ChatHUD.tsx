import React, { useState, useRef, useEffect } from "react";
import { Send, Mic, MicOff, Sparkles, User, Bot, Volume2, Shield } from "lucide-react";
import { sounds } from "../utils/audioSynthesizer.ts";
import { speechService } from "../utils/speechService.ts";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  imageThumbnail?: string;
}

interface ChatHUDProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  isThinking: boolean;
  isListening: boolean;
  onToggleMic: () => void;
  userName: string;
  onUpdateUserName: (name: string) => void;
}

export const ChatHUD: React.FC<ChatHUDProps> = ({
  messages,
  onSendMessage,
  isThinking,
  isListening,
  onToggleMic,
  userName,
  onUpdateUserName,
}) => {
  const [inputText, setInputText] = useState("");
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(userName);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isThinking]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isThinking) return;
    onSendMessage(inputText.trim());
    setInputText("");
    sounds.playChirp();
  };

  const handleQuickPrompt = (prompt: string) => {
    onSendMessage(prompt);
    sounds.playChirp();
  };

  const handleSaveName = (e: React.FormEvent) => {
    e.preventDefault();
    if (tempName.trim()) {
      onUpdateUserName(tempName.trim());
      setIsEditingName(false);
      sounds.playChirp();
    }
  };

  return (
    <div className="flex flex-col h-[520px] bg-slate-950/80 border border-cyan-500/30 rounded-xl overflow-hidden hud-corner shadow-[0_0_25px_rgba(6,182,212,0.15)]">
      {/* Top HUD Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900/90 border-b border-cyan-500/20 font-mono text-xs">
        <div className="flex items-center gap-2 text-cyan-300">
          <Bot className="w-4 h-4 text-cyan-400 animate-pulse" />
          <span className="font-hud uppercase tracking-wider font-semibold">
            JARVIS Muloqot Terminali
          </span>
        </div>

        {/* User Identity chip */}
        <div className="flex items-center gap-2">
          {isEditingName ? (
            <form onSubmit={handleSaveName} className="flex items-center gap-1">
              <input
                type="text"
                value={tempName}
                onChange={(e) => setTempName(e.target.value)}
                placeholder="Ismingiz"
                className="px-2 py-0.5 rounded bg-slate-950 border border-cyan-400 text-cyan-200 text-xs w-28 focus:outline-none"
                autoFocus
              />
              <button
                type="submit"
                className="px-2 py-0.5 rounded bg-cyan-600 text-black text-[10px] font-bold uppercase cursor-pointer"
              >
                OK
              </button>
            </form>
          ) : (
            <button
              onClick={() => setIsEditingName(true)}
              className="flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-slate-900 border border-cyan-500/30 text-cyan-300 text-xs hover:border-cyan-400 transition cursor-pointer"
              title="Ismni o'zgartirish (sukut bo'yicha: Janob)"
            >
              <User className="w-3 h-3 text-cyan-400" />
              <span>{userName || "janob"}</span>
              <span className="text-[10px] text-slate-500">(tahrir)</span>
            </button>
          )}
        </div>
      </div>

      {/* Message Feed */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3.5">
        {messages.map((msg) => {
          const isUser = msg.role === "user";
          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}
            >
              <div className="flex items-center gap-1.5 mb-1 px-1 text-[10px] font-mono text-slate-500">
                {isUser ? (
                  <>
                    <span>{userName || "Janob"}</span>
                    <User className="w-3 h-3 text-amber-400" />
                  </>
                ) : (
                  <>
                    <Bot className="w-3 h-3 text-cyan-400" />
                    <span className="text-cyan-400 font-semibold font-hud">JARVIS</span>
                  </>
                )}
                <span>•</span>
                <span>
                  {new Date(msg.timestamp).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>

              <div
                className={`max-w-[85%] rounded-xl p-3 text-xs leading-relaxed ${
                  isUser
                    ? "bg-slate-900 border border-amber-500/30 text-slate-200 rounded-tr-none shadow-[0_0_10px_rgba(245,158,11,0.1)]"
                    : "bg-cyan-950/40 border border-cyan-500/30 text-cyan-100 rounded-tl-none shadow-[0_0_15px_rgba(6,182,212,0.15)]"
                }`}
              >
                {/* Image attachment thumbnail if sent */}
                {msg.imageThumbnail && (
                  <div className="mb-2 rounded overflow-hidden border border-cyan-500/30 max-w-[200px]">
                    <img
                      src={msg.imageThumbnail}
                      alt="Kamera kadri"
                      className="w-full h-auto object-cover"
                    />
                  </div>
                )}
                <div className="whitespace-pre-wrap">{msg.content}</div>

                {/* Voice repeat button for assistant */}
                {!isUser && (
                  <div className="mt-2 pt-1 border-t border-cyan-500/20 flex justify-end">
                    <button
                      onClick={() => speechService.speak(msg.content)}
                      className="text-[10px] text-cyan-400/70 hover:text-cyan-300 flex items-center gap-1 transition cursor-pointer"
                      title="Qayta ovoz chiqarish"
                    >
                      <Volume2 className="w-3 h-3" />
                      <span>Eshitish</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Thinking Indicator */}
        {isThinking && (
          <div className="flex items-center gap-2 p-3 max-w-[200px] rounded-xl rounded-tl-none bg-cyan-950/30 border border-cyan-500/20 text-cyan-300 text-xs font-mono">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span>JARVIS tahlil qilmoqda...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompts Pills */}
      <div className="px-3 py-2 bg-slate-900/60 border-t border-cyan-500/10 flex items-center gap-2 overflow-x-auto text-xs no-scrollbar">
        <span className="text-[10px] font-mono text-slate-500 uppercase shrink-0">
          Tezkor:
        </span>
        {[
          "Shaxmat o'ynaymiz",
          "Kayfiyatim qanday ko'rinyapti?",
          "Bugungi holat tahlili",
          "Menga Toni Stark haqida aytib ber",
        ].map((pill, idx) => (
          <button
            key={idx}
            onClick={() => handleQuickPrompt(pill)}
            className="shrink-0 px-2.5 py-1 rounded-full bg-slate-950/80 hover:bg-cyan-950/60 border border-cyan-500/30 text-cyan-300 text-[11px] font-mono transition cursor-pointer"
          >
            {pill}
          </button>
        ))}
      </div>

      {/* Input Field & Microphone */}
      <form
        onSubmit={handleSubmit}
        className="p-3 bg-slate-950/95 border-t border-cyan-500/20 flex items-center gap-2"
      >
        <button
          type="button"
          onClick={onToggleMic}
          className={`p-2.5 rounded-lg border transition cursor-pointer ${
            isListening
              ? "bg-amber-500 border-amber-400 text-black shadow-[0_0_15px_rgba(251,191,36,0.8)] animate-pulse"
              : "bg-slate-900 border-cyan-500/30 text-cyan-300 hover:border-cyan-400 hover:bg-slate-800"
          }`}
          title={isListening ? "Tinglashni to'xtatish" : "Ovoz bilan gapirish"}
        >
          {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        </button>

        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={
            isListening
              ? "Tinglanmoqda, gapiring..."
              : "JARVIS'ga buyruq yoki savol yozing..."
          }
          className="flex-1 px-3.5 py-2 rounded-lg bg-slate-900 border border-cyan-500/30 text-xs font-mono text-cyan-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400"
        />

        <button
          type="submit"
          disabled={!inputText.trim() || isThinking}
          className="p-2.5 rounded-lg bg-cyan-600/30 border border-cyan-400/50 hover:bg-cyan-500/40 text-cyan-200 transition disabled:opacity-40 cursor-pointer shadow-[0_0_10px_rgba(6,182,212,0.3)]"
          title="Yuborish"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
