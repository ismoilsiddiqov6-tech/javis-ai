import React, { useState, useEffect } from "react";
import { Shield, Cpu, Activity, Clock, Terminal } from "lucide-react";

interface JarvisHeaderProps {
  activeTab: "overview" | "vision" | "chess";
  setActiveTab: (tab: "overview" | "vision" | "chess") => void;
  userName: string;
}

export const JarvisHeader: React.FC<JarvisHeaderProps> = ({
  activeTab,
  setActiveTab,
  userName,
}) => {
  const [timeStr, setTimeStr] = useState<string>("");
  const [dateStr, setDateStr] = useState<string>("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString("uz-UZ", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
      setDateStr(
        now.toLocaleDateString("uz-UZ", {
          year: "numeric",
          month: "short",
          day: "numeric",
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="relative w-full border-b border-cyan-500/30 bg-slate-950/90 backdrop-blur-md px-4 py-3 select-none z-20">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Stark Industries Branding & System status */}
        <div className="flex items-center gap-3.5">
          <div className="relative w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-900 to-slate-950 border border-cyan-400/60 flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.4)]">
            <Cpu className="w-5 h-5 text-cyan-300 animate-pulse" />
            <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 border border-black shadow-[0_0_6px_#34d399]" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-hud font-bold text-lg text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-cyan-100 to-blue-300 tracking-wider">
                J.A.R.V.I.S.
              </h1>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-950/70 border border-cyan-500/40 text-cyan-300">
                MARK LXXXV
              </span>
            </div>
            <p className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5">
              <span>JUST A RATHER VERY INTELLIGENT SYSTEM</span>
              <span className="text-cyan-500">•</span>
              <span className="text-emerald-400">FAOL</span>
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-lg border border-cyan-500/20">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-3 py-1.5 rounded-md text-xs font-hud uppercase tracking-wider transition cursor-pointer ${
              activeTab === "overview"
                ? "bg-cyan-600/30 border border-cyan-400 text-cyan-200 shadow-[0_0_12px_rgba(6,182,212,0.4)]"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
            }`}
          >
            Boshqaruv
          </button>
          <button
            onClick={() => setActiveTab("vision")}
            className={`px-3 py-1.5 rounded-md text-xs font-hud uppercase tracking-wider transition cursor-pointer ${
              activeTab === "vision"
                ? "bg-cyan-600/30 border border-cyan-400 text-cyan-200 shadow-[0_0_12px_rgba(6,182,212,0.4)]"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
            }`}
          >
            Kamera & Ko'rish
          </button>
          <button
            onClick={() => setActiveTab("chess")}
            className={`px-3 py-1.5 rounded-md text-xs font-hud uppercase tracking-wider transition cursor-pointer ${
              activeTab === "chess"
                ? "bg-cyan-600/30 border border-cyan-400 text-cyan-200 shadow-[0_0_12px_rgba(6,182,212,0.4)]"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
            }`}
          >
            Shaxmat Maydoni
          </button>
        </nav>

        {/* Live System Telemetry / Clock */}
        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="hidden sm:flex items-center gap-1.5 text-cyan-400/80 bg-slate-900/60 px-2.5 py-1 rounded border border-cyan-500/20">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span>{timeStr}</span>
            <span className="text-slate-500 text-[10px]">{dateStr}</span>
          </div>

          <div className="flex items-center gap-1.5 text-emerald-400 text-[11px] bg-slate-900/60 px-2.5 py-1 rounded border border-emerald-500/30">
            <Shield className="w-3.5 h-3.5" />
            <span>XIZMATDA, {userName ? userName.toUpperCase() : "JANOB"}</span>
          </div>
        </div>
      </div>
    </header>
  );
};
