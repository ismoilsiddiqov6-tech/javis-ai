/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import { JarvisHeader } from "./components/JarvisHeader.tsx";
import { ArcReactor } from "./components/ArcReactor.tsx";
import { CameraHUD, VisionData } from "./components/CameraHUD.tsx";
import { ChessGame, PlayerColor, ChessLevel } from "./components/ChessGame.tsx";
import { ChatHUD, ChatMessage } from "./components/ChatHUD.tsx";
import { sounds } from "./utils/audioSynthesizer.ts";
import { speechService } from "./utils/speechService.ts";
import {
  Sparkles,
  Swords,
  Eye,
  Activity,
  CheckCircle2,
  Terminal,
  Volume2,
} from "lucide-react";

export default function App() {
  const [userName, setUserName] = useState<string>("janob");
  const [activeTab, setActiveTab] = useState<"overview" | "vision" | "chess">("overview");
  const [jarvisState, setJarvisState] = useState<"idle" | "listening" | "speaking" | "thinking">("idle");
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [lastVision, setLastVision] = useState<VisionData | null>(null);

  // Chat conversation history
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: "initial-greeting",
      role: "assistant",
      content: "Xayrli kun, janob. Sizga qanday yordam bera olaman?",
      timestamp: Date.now(),
    },
  ]);

  // Initial greeting speech (triggered on first user interaction)
  const hasSpokenGreetingRef = useRef(false);

  const speakText = useCallback(
    (text: string) => {
      if (isMuted) return;
      setJarvisState("speaking");
      speechService.speak(text, {
        onEnd: () => {
          setJarvisState("idle");
        },
      });
    },
    [isMuted]
  );

  // Trigger greeting audio when user clicks or starts
  useEffect(() => {
    if (!hasSpokenGreetingRef.current) {
      hasSpokenGreetingRef.current = true;
      // Many browsers block autoplay audio before interaction, speak when page mounts
      const timeout = setTimeout(() => {
        speakText("Xayrli kun, janob. Sizga qanday yordam bera olaman?");
      }, 800);
      return () => clearTimeout(timeout);
    }
  }, [speakText]);

  // Toggle Mute
  const handleToggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    sounds.enabled = !next;
    if (next) {
      speechService.stopSpeaking();
      setJarvisState("idle");
    } else {
      sounds.playChirp();
    }
  };

  // Send message to Gemini server
  const handleSendMessage = async (text: string, imageBase64?: string) => {
    if (!text.trim() && !imageBase64) return;

    // Detect if user is introducing their name
    const nameMatch = text.match(
      /(?:mening ismim|ismim|meni)\s+([A-Z\u0400-\u04FF][a-z\u0400-\u04FF\w]*)/i
    );
    if (nameMatch && nameMatch[1]) {
      setUserName(nameMatch[1]);
    }

    // Detect if user wants to play chess
    const isChessIntent = /shaxmat|chess|o['']ynaymiz|shaxmat o'yn/i.test(text);
    if (isChessIntent && activeTab !== "chess") {
      setActiveTab("chess");
    }

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text,
      timestamp: Date.now(),
      imageThumbnail: imageBase64,
    };

    setMessages((prev) => [...prev, userMsg]);
    setJarvisState("thinking");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          imageBase64,
          userName,
          history: messages.slice(-6).map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      const data = await res.json();
      const reply = data.reply || "Bajarildi, janob.";

      const assistantMsg: ChatMessage = {
        id: `jarvis-${Date.now()}`,
        role: "assistant",
        content: reply,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
      speakText(reply);
    } catch (err) {
      console.error("Chat error:", err);
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: "assistant",
        content:
          "Kechirasiz, janob. Aloqa liniyasida xatolik yuz berdi. Qaytadan urinib ko'ramizmi?",
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMsg]);
      setJarvisState("idle");
    }
  };

  // Toggle Microphone
  const handleToggleMic = () => {
    if (jarvisState === "listening") {
      speechService.stopListening();
      setJarvisState("idle");
      sounds.playChirp();
    } else {
      sounds.playPowerUp();
      speechService.startListening({
        onTranscript: (transcript, isFinal) => {
          if (isFinal && transcript.trim()) {
            handleSendMessage(transcript.trim());
          }
        },
        onListeningChange: (listening) => {
          setJarvisState(listening ? "listening" : "idle");
        },
        onError: (err) => {
          console.warn("STT error:", err);
          setJarvisState("idle");
        },
      });
    }
  };

  // Vision scan result handler
  const handleScanResult = (data: VisionData, _snapshot: string) => {
    setLastVision(data);
    sounds.playChirp();
  };

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Top Futuristic Header */}
      <JarvisHeader
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        userName={userName}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 flex flex-col space-y-6">
        {/* OVERVIEW TAB */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Arc Reactor Core + Telemetry */}
            <div className="lg:col-span-5 flex flex-col space-y-5">
              <div className="bg-slate-950/80 border border-cyan-500/30 rounded-xl p-4 hud-corner shadow-[0_0_20px_rgba(6,182,212,0.15)] flex flex-col items-center">
                <div className="w-full flex items-center justify-between text-xs font-mono text-cyan-400 border-b border-cyan-500/20 pb-2 mb-2">
                  <span className="flex items-center gap-1.5 font-hud">
                    <Activity className="w-3.5 h-3.5 text-cyan-300" />
                    REAKTOR YADROSI
                  </span>
                  <span className="text-emerald-400">STATUS: OPTIMAL</span>
                </div>

                <ArcReactor
                  state={jarvisState}
                  onMicClick={handleToggleMic}
                  isMuted={isMuted}
                  onToggleMute={handleToggleMute}
                />

                <div className="w-full mt-2 pt-3 border-t border-cyan-500/20 text-center">
                  <p className="text-xs text-cyan-300/80 font-mono">
                    {jarvisState === "listening"
                      ? "Ovozingiz tinglanmoqda, gapiring..."
                      : jarvisState === "speaking"
                      ? "JARVIS javob bermoqda..."
                      : jarvisState === "thinking"
                      ? "Tizim ma'lumotlarni hisoblamoqda..."
                      : "Mikrofonni bosib gapirishingiz yoki quyida yozishingiz mumkin"}
                  </p>
                </div>
              </div>

              {/* Quick Vision Preview Card */}
              <div className="bg-slate-950/80 border border-cyan-500/30 rounded-xl p-4 hud-corner">
                <div className="flex items-center justify-between text-xs font-mono text-cyan-400 mb-3">
                  <span className="flex items-center gap-1.5 font-hud">
                    <Eye className="w-4 h-4 text-cyan-300" />
                    Kamera Ko'rinishi
                  </span>
                  <button
                    onClick={() => setActiveTab("vision")}
                    className="text-[11px] text-cyan-300 hover:underline cursor-pointer"
                  >
                    To'liq ekran →
                  </button>
                </div>
                <CameraHUD
                  onScanResult={handleScanResult}
                  onSendTextMessage={handleSendMessage}
                  isScanning={isScanning}
                  setIsScanning={setIsScanning}
                />
              </div>

              {/* Quick Chess Launch Banner */}
              <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-cyan-950/40 border border-cyan-500/40 rounded-xl p-4 flex items-center justify-between shadow-[0_0_15px_rgba(6,182,212,0.15)]">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-cyan-600/20 border border-cyan-400/50 text-cyan-300">
                    <Swords className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-hud font-bold text-cyan-200">
                      JARVIS bilan Shaxmat
                    </h3>
                    <p className="text-xs text-slate-400">
                      Standart FIDE qoidalari, ovozli izoh va yurishlar
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setActiveTab("chess");
                    sounds.playChirp();
                  }}
                  className="px-3.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-hud font-bold uppercase tracking-wider transition cursor-pointer shadow-[0_0_15px_rgba(6,182,212,0.5)]"
                >
                  O'ynash
                </button>
              </div>
            </div>

            {/* Right Column: Interactive Chat Terminal */}
            <div className="lg:col-span-7">
              <ChatHUD
                messages={messages}
                onSendMessage={handleSendMessage}
                isThinking={jarvisState === "thinking"}
                isListening={jarvisState === "listening"}
                onToggleMic={handleToggleMic}
                userName={userName}
                onUpdateUserName={setUserName}
              />
            </div>
          </div>
        )}

        {/* VISION HUD TAB */}
        {activeTab === "vision" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <h2 className="text-base font-hud font-bold text-cyan-200 uppercase tracking-wider flex items-center gap-2">
                <Eye className="w-5 h-5 text-cyan-400" />
                Optik Ko'rish & Kayfiyatni Aniqlash Tizimi
              </h2>
              <span className="text-xs font-mono text-slate-400">
                Gemini Multimodal Vision
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-8">
                <CameraHUD
                  onScanResult={handleScanResult}
                  onSendTextMessage={handleSendMessage}
                  isScanning={isScanning}
                  setIsScanning={setIsScanning}
                />
              </div>

              {/* Vision telemetry & instructions */}
              <div className="lg:col-span-4 space-y-4">
                <div className="bg-slate-950/80 border border-cyan-500/30 rounded-xl p-4 hud-corner space-y-3 font-mono text-xs">
                  <div className="text-cyan-400 font-hud text-sm font-semibold flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-cyan-300" />
                    Kuzatuv Qoidalari
                  </div>
                  <ul className="space-y-2 text-slate-300 list-disc list-inside text-[11px] leading-relaxed">
                    <li>
                      JARVIS yuz ifodangiz va holatingizga qarab kayfiyatni taxmin
                      qiladi ("xursand", "charchagan", "xafa").
                    </li>
                    <li>
                      Agar charchagan ko'rinsangiz, ehtiyotkorlik bilan hol-ahvol
                      so'raydi.
                    </li>
                    <li>
                      Tasvir noaniq bo'lsa, sizdan kamerani to'g'rilab berishni
                      so'raydi.
                    </li>
                    <li>
                      Kamerada shaxmat taxtasi ko'rinsa, donalarni tahlil qilishga
                      yordam beradi.
                    </li>
                  </ul>
                </div>

                {lastVision && (
                  <div className="bg-slate-950/80 border border-cyan-500/30 rounded-xl p-4 hud-corner space-y-2 font-mono text-xs">
                    <div className="text-cyan-300 font-semibold font-hud">
                      Oxirgi Tahlil Natijalari
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800">
                      <span className="text-slate-400">Odam mavjudligi:</span>
                      <span className="text-emerald-400">
                        {lastVision.detected ? "Aniqlangan" : "Ko'rinmadi"}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800">
                      <span className="text-slate-400">Kayfiyat:</span>
                      <span className="text-cyan-300 capitalize">
                        {lastVision.mood}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800">
                      <span className="text-slate-400">Ishonch ko'rsatkichi:</span>
                      <span className="text-amber-400">
                        {Math.round(lastVision.moodConfidence * 100)}%
                      </span>
                    </div>
                    {lastVision.tactfulComment && (
                      <div className="pt-2 text-cyan-200 italic">
                        "{lastVision.tactfulComment}"
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* CHESS TAB */}
        {activeTab === "chess" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <h2 className="text-base font-hud font-bold text-cyan-200 uppercase tracking-wider flex items-center gap-2">
                <Swords className="w-5 h-5 text-cyan-400" />
                JARVIS bilan Shaxmat Bellashuvi
              </h2>
              <span className="text-xs font-mono text-slate-400">
                FIDE Qoidalari • Minimax Dvigateli
              </span>
            </div>

            <ChessGame
              onJarvisSpeak={speakText}
              onSendChatMessage={handleSendMessage}
            />
          </div>
        )}
      </main>

      {/* Footer Status Bar */}
      <footer className="w-full border-t border-cyan-500/20 bg-slate-950/80 py-2.5 px-4 text-center font-mono text-[11px] text-slate-500 flex flex-wrap items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>STARK INDUSTRIES AI ENGINE • ONLINE</span>
        </div>
        <div>JARVIS - SIZNING SHAXSIY YORDAMCHINGIZ</div>
        <div className="text-cyan-500/60 font-hud">PROTOCOL ACTIVE</div>
      </footer>
    </div>
  );
}
