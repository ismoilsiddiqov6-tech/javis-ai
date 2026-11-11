import React from "react";
import { Mic, MicOff, Volume2, Sparkles } from "lucide-react";

interface ArcReactorProps {
  state: "idle" | "listening" | "speaking" | "thinking";
  onMicClick: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const ArcReactor: React.FC<ArcReactorProps> = ({
  state,
  onMicClick,
  isMuted,
  onToggleMute,
}) => {
  return (
    <div className="relative flex flex-col items-center justify-center p-6 select-none">
      {/* Outer ambient glow */}
      <div
        className={`absolute w-64 h-64 rounded-full blur-3xl transition-all duration-700 pointer-events-none ${
          state === "speaking"
            ? "bg-cyan-500/25 scale-110"
            : state === "listening"
            ? "bg-amber-500/25 scale-110"
            : state === "thinking"
            ? "bg-blue-600/30 scale-105"
            : "bg-cyan-900/15 scale-95"
        }`}
      />

      {/* Main Reactor Body */}
      <div className="relative w-52 h-52 sm:w-60 sm:h-60 flex items-center justify-center">
        {/* Outermost Segmented Ring (Tech notches) */}
        <div
          className={`absolute inset-0 rounded-full border border-cyan-500/20 ${
            state === "thinking" ? "animate-spin-slow" : ""
          }`}
          style={{
            backgroundImage:
              "repeating-conic-gradient(from 0deg, rgba(6,182,212,0.3) 0deg 8deg, transparent 8deg 30deg)",
          }}
        />

        {/* Counter-rotating dashed HUD ring */}
        <div className="absolute inset-3 rounded-full border-2 border-dashed border-cyan-400/30 animate-spin-reverse" />

        {/* Outer Solid Ring with Tech Accents */}
        <div className="absolute inset-6 rounded-full border border-cyan-400/50 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
          {/* 8 Cardinal power coils */}
          {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
            <div
              key={angle}
              className="absolute top-1/2 left-1/2 w-3 h-5 -mt-2.5 -ml-1.5 rounded-sm bg-gradient-to-t from-cyan-950 via-cyan-500 to-cyan-200 border border-cyan-300 shadow-[0_0_8px_rgba(6,182,212,0.8)]"
              style={{
                transform: `rotate(${angle}deg) translate(0, -96px)`,
              }}
            />
          ))}
        </div>

        {/* Middle Energy Channel Ring */}
        <div
          className={`absolute inset-12 rounded-full border-2 border-cyan-300/60 transition-transform duration-500 ${
            state === "speaking"
              ? "scale-105 border-cyan-200 shadow-[0_0_25px_rgba(6,182,212,0.8)]"
              : state === "listening"
              ? "scale-105 border-amber-400 shadow-[0_0_25px_rgba(251,191,36,0.8)]"
              : "shadow-[0_0_10px_rgba(6,182,212,0.4)]"
          }`}
        />

        {/* Core Button & Interactive Mic Trigger */}
        <button
          onClick={onMicClick}
          title={
            state === "listening"
              ? "Tinglashni to'xtatish"
              : "JARVIS bilan ovozli gaplashish"
          }
          className={`relative z-10 w-24 h-24 rounded-full flex flex-col items-center justify-center transition-all duration-300 group cursor-pointer focus:outline-none ${
            state === "listening"
              ? "bg-gradient-to-br from-amber-400 to-amber-600 text-black shadow-[0_0_35px_rgba(251,191,36,0.9)] animate-pulse"
              : state === "speaking"
              ? "bg-gradient-to-br from-cyan-300 via-cyan-500 to-blue-600 text-black shadow-[0_0_35px_rgba(6,182,212,0.9)]"
              : state === "thinking"
              ? "bg-gradient-to-br from-blue-500 to-indigo-700 text-white shadow-[0_0_25px_rgba(59,130,246,0.8)]"
              : "bg-slate-950/90 text-cyan-300 border border-cyan-400/40 hover:border-cyan-300 hover:shadow-[0_0_20px_rgba(6,182,212,0.7)]"
          }`}
        >
          {state === "listening" ? (
            <Mic className="w-8 h-8 animate-bounce" />
          ) : state === "speaking" ? (
            <Sparkles className="w-8 h-8 animate-spin-slow" />
          ) : (
            <Mic className="w-8 h-8 group-hover:scale-110 transition-transform" />
          )}

          <span className="text-[10px] uppercase font-bold tracking-widest mt-1 font-hud">
            {state === "listening"
              ? "TINGLASH"
              : state === "speaking"
              ? "JARVIS"
              : state === "thinking"
              ? "TAHLIL"
              : "BOSHLASH"}
          </span>
        </button>

        {/* Status Indicator text badge underneath */}
      </div>

      {/* Futuristic Sound Waveform Bars */}
      <div className="flex items-center gap-1.5 mt-5 h-8">
        {[20, 45, 80, 50, 100, 65, 90, 40, 75, 30, 85, 45].map((height, i) => (
          <div
            key={i}
            className={`w-1 rounded-full transition-all duration-200 ${
              state === "speaking"
                ? "bg-gradient-to-t from-cyan-500 to-cyan-200"
                : state === "listening"
                ? "bg-gradient-to-t from-amber-500 to-amber-200"
                : state === "thinking"
                ? "bg-gradient-to-t from-blue-500 to-indigo-300"
                : "bg-cyan-950/60"
            }`}
            style={{
              height:
                state === "speaking"
                  ? `${Math.max(12, ((height * (i % 2 === 0 ? 1.2 : 0.8)) % 32) + 6)}px`
                  : state === "listening"
                  ? `${Math.max(10, ((height * 1.1) % 28) + 6)}px`
                  : state === "thinking"
                  ? `${14 + (i % 3) * 6}px`
                  : "6px",
            }}
          />
        ))}
      </div>

      {/* Audio Mute Quick Toggle */}
      <div className="flex items-center gap-4 mt-3">
        <button
          onClick={onToggleMute}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono transition-colors border ${
            isMuted
              ? "bg-red-950/40 border-red-500/40 text-red-400 hover:bg-red-900/40"
              : "bg-cyan-950/30 border-cyan-500/30 text-cyan-300 hover:bg-cyan-900/40"
          }`}
        >
          {isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          <span>{isMuted ? "Ovoz: O'chiq" : "Ovoz: Faol"}</span>
        </button>
      </div>
    </div>
  );
};
