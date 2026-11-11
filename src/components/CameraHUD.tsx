import React, { useRef, useState, useEffect } from "react";
import {
  Camera,
  CameraOff,
  Scan,
  Smile,
  Frown,
  AlertCircle,
  Eye,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { sounds } from "../utils/audioSynthesizer.ts";

export interface VisionData {
  detected: boolean;
  mood: string;
  moodConfidence: number;
  tactfulComment: string | null;
  visualDetails: string;
  chessBoardVisible: boolean;
  timestamp?: number;
}

interface CameraHUDProps {
  onScanResult: (data: VisionData, snapshotBase64: string) => void;
  onSendTextMessage: (msg: string, snapshotBase64?: string) => void;
  isScanning: boolean;
  setIsScanning: (scanning: boolean) => void;
}

export const CameraHUD: React.FC<CameraHUDProps> = ({
  onScanResult,
  onSendTextMessage,
  isScanning,
  setIsScanning,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [streamActive, setStreamActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [autoScanEnabled, setAutoScanEnabled] = useState<boolean>(false);
  const [lastVisionData, setLastVisionData] = useState<VisionData | null>(null);

  // Start Camera
  const startCamera = async () => {
    setCameraError(null);
    try {
      sounds.playPowerUp();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user",
        },
        audio: false,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setStreamActive(true);
      }
    } catch (err: any) {
      console.error("Camera access error:", err);
      setCameraError(
        "Kameraga ulanib bo'lmadi. Iltimos brauzer ruxsatini tekshiring."
      );
      setStreamActive(false);
    }
  };

  // Stop Camera
  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setStreamActive(false);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Capture current video frame as base64 JPEG
  const captureFrame = (): string | null => {
    if (!videoRef.current || !canvasRef.current || !streamActive) return null;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (video.videoWidth === 0 || video.videoHeight === 0) return null;

    canvas.width = Math.min(video.videoWidth, 800);
    canvas.height = Math.round(
      (canvas.width / video.videoWidth) * video.videoHeight
    );

    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.82);
  };

  // Perform Vision scan with Gemini
  const performScan = async (promptOverride?: string) => {
    const frame = captureFrame();
    if (!frame) {
      if (!streamActive) {
        await startCamera();
      }
      return;
    }

    setIsScanning(true);
    sounds.playScanSound();

    try {
      const res = await fetch("/api/vision-scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: frame }),
      });
      const data: VisionData = await res.json();
      data.timestamp = Date.now();
      setLastVisionData(data);
      onScanResult(data, frame);

      if (promptOverride) {
        onSendTextMessage(promptOverride, frame);
      } else if (data.tactfulComment) {
        // If there's an appropriate observation
        onSendTextMessage(
          `[Vizual kuzatuv]: ${data.tactfulComment}`,
          frame
        );
      }
    } catch (err: any) {
      console.error("Scan error:", err);
    } finally {
      setIsScanning(false);
    }
  };

  // Periodic Auto-scan (every 40 seconds when active)
  useEffect(() => {
    if (!autoScanEnabled || !streamActive) return;
    const interval = setInterval(() => {
      performScan();
    }, 40000);
    return () => clearInterval(interval);
  }, [autoScanEnabled, streamActive]);

  const getMoodBadge = (mood?: string) => {
    switch (mood) {
      case "xursand":
        return { label: "Xursand", color: "text-emerald-400 border-emerald-500/40 bg-emerald-950/30", icon: Smile };
      case "charchagan":
        return { label: "Charchagan", color: "text-amber-400 border-amber-500/40 bg-amber-950/30", icon: AlertCircle };
      case "xafa":
        return { label: "Xafa", color: "text-blue-400 border-blue-500/40 bg-blue-950/30", icon: Frown };
      case "g'azabli":
        return { label: "G'azabli", color: "text-red-400 border-red-500/40 bg-red-950/30", icon: AlertCircle };
      case "xotirjam":
        return { label: "Xotirjam", color: "text-cyan-400 border-cyan-500/40 bg-cyan-950/30", icon: Eye };
      default:
        return { label: mood || "Tahlil kutilmoqda", color: "text-slate-400 border-slate-700 bg-slate-900/40", icon: Eye };
    }
  };

  const badge = getMoodBadge(lastVisionData?.mood);
  const MoodIcon = badge.icon;

  return (
    <div className="relative flex flex-col bg-slate-950/80 border border-cyan-500/30 rounded-xl overflow-hidden hud-corner shadow-[0_0_20px_rgba(6,182,212,0.15)]">
      {/* Hidden processing canvas */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900/90 border-b border-cyan-500/20 font-mono text-xs">
        <div className="flex items-center gap-2 text-cyan-300">
          <Eye className="w-4 h-4 animate-pulse text-cyan-400" />
          <span className="font-hud uppercase tracking-wider font-semibold">
            Vizual Sensor & Kayfiyat Tahlili
          </span>
        </div>
        <div className="flex items-center gap-2">
          {streamActive ? (
            <span className="flex items-center gap-1.5 text-emerald-400 text-[11px]">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              ONLINE
            </span>
          ) : (
            <span className="text-slate-500 text-[11px]">STANDBY</span>
          )}
        </div>
      </div>

      {/* Video Viewport Area */}
      <div className="relative w-full aspect-video sm:min-h-[260px] bg-black/90 flex items-center justify-center overflow-hidden scanline-effect">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover transform -scale-x-100 ${
            !streamActive ? "hidden" : ""
          }`}
        />

        {/* Inactive Placeholder */}
        {!streamActive && (
          <div className="flex flex-col items-center justify-center text-center p-6 text-slate-400">
            <Camera className="w-12 h-12 text-cyan-500/40 mb-3" />
            <p className="text-sm font-medium text-slate-300">
              Kamera faol emas
            </p>
            <p className="text-xs text-slate-500 max-w-xs mt-1">
              JARVIS sizni ko'rishi, kayfiyatingizni sezishi va shaxmat taxtasini
              tahlil qilishi uchun kamerani yoqing.
            </p>
            <button
              onClick={startCamera}
              className="mt-4 px-4 py-1.5 rounded-lg bg-cyan-600/30 border border-cyan-400/50 hover:bg-cyan-500/40 text-cyan-200 text-xs font-hud uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)] cursor-pointer"
            >
              Kamerani yoqish
            </button>
          </div>
        )}

        {/* HUD Target Overlays (when active) */}
        {streamActive && (
          <>
            {/* Target Reticle in Center */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="relative w-48 h-48 border border-cyan-400/25 rounded-full animate-pulse">
                {/* Horizontal & vertical crosshairs */}
                <div className="absolute top-1/2 left-0 w-4 h-[1px] bg-cyan-400/60" />
                <div className="absolute top-1/2 right-0 w-4 h-[1px] bg-cyan-400/60" />
                <div className="absolute top-0 left-1/2 w-[1px] h-4 bg-cyan-400/60" />
                <div className="absolute bottom-0 left-1/2 w-[1px] h-4 bg-cyan-400/60" />
              </div>
            </div>

            {/* Top Left Telemetry */}
            <div className="absolute top-3 left-3 pointer-events-none font-mono text-[10px] text-cyan-400/80 bg-slate-950/70 p-2 rounded border border-cyan-500/20 backdrop-blur-sm space-y-0.5">
              <div>STARK_OPTICS::FEED_ACTIVE</div>
              <div>RES: 1280x720 30FPS</div>
              <div>STABILITY: 99.4%</div>
            </div>

            {/* Scanning beam overlay */}
            {isScanning && (
              <div className="absolute inset-0 bg-cyan-500/10 pointer-events-none flex flex-col items-center justify-center backdrop-blur-[1px]">
                <div className="w-full h-1 bg-cyan-300 shadow-[0_0_20px_#06b6d4] animate-pulse" />
                <div className="mt-2 text-xs font-mono text-cyan-200 uppercase tracking-widest bg-black/80 px-3 py-1 rounded border border-cyan-400">
                  GEMINI_VISION::TAHLIL QILINMOQDA...
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Camera Error Message */}
      {cameraError && (
        <div className="px-4 py-2 bg-red-950/60 border-t border-red-500/40 text-red-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
          <span>{cameraError}</span>
        </div>
      )}

      {/* Observation & Mood Status Bar */}
      {lastVisionData && (
        <div className="px-4 py-2.5 bg-slate-900/70 border-t border-cyan-500/20 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-mono">Kayfiyat:</span>
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-xs font-medium ${badge.color}`}
            >
              <MoodIcon className="w-3.5 h-3.5" />
              {badge.label}
              {lastVisionData.moodConfidence > 0 && (
                <span className="opacity-75 font-mono text-[10px]">
                  ({Math.round(lastVisionData.moodConfidence * 100)}%)
                </span>
              )}
            </span>
          </div>

          {lastVisionData.chessBoardVisible && (
            <span className="text-amber-400 bg-amber-950/40 border border-amber-500/30 px-2 py-0.5 rounded text-[11px] font-mono flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Shaxmat taxtasi ko'rindi
            </span>
          )}

          {lastVisionData.visualDetails && (
            <div className="w-full text-[11px] text-cyan-200/90 font-mono truncate">
              {lastVisionData.visualDetails}
            </div>
          )}
        </div>
      )}

      {/* Control Actions */}
      <div className="p-3 bg-slate-950/90 border-t border-cyan-500/20 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {streamActive ? (
            <button
              onClick={stopCamera}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition border border-slate-700 cursor-pointer"
            >
              <CameraOff className="w-3.5 h-3.5" />
              <span>O'chirish</span>
            </button>
          ) : (
            <button
              onClick={startCamera}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-cyan-700/40 hover:bg-cyan-600/50 text-cyan-200 text-xs transition border border-cyan-500/40 cursor-pointer"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Kamerani yoqish</span>
            </button>
          )}

          <button
            onClick={() => performScan()}
            disabled={!streamActive || isScanning}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-cyan-600/30 hover:bg-cyan-500/40 text-cyan-200 text-xs transition border border-cyan-400/40 disabled:opacity-40 cursor-pointer"
            title="JARVIS hozirgi kadrni ko'rib tahlil qiladi"
          >
            <Scan className="w-3.5 h-3.5 text-cyan-300" />
            <span>Kuzatish</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick scan for chessboard */}
          <button
            onClick={() =>
              performScan(
                "Kamerada shaxmat taxtasi yoki holati ko'rinyaptimi? Men nima qilayotganimni ko'rib ayting."
              )
            }
            disabled={!streamActive || isScanning}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded bg-indigo-950/50 hover:bg-indigo-900/50 text-indigo-200 border border-indigo-500/30 text-xs cursor-pointer disabled:opacity-40"
          >
            <Sparkles className="w-3 h-3 text-indigo-400" />
            <span>Taxtani tekshirish</span>
          </button>

          {/* Auto scan toggle */}
          <button
            onClick={() => setAutoScanEnabled(!autoScanEnabled)}
            disabled={!streamActive}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded text-xs border transition cursor-pointer disabled:opacity-40 ${
              autoScanEnabled
                ? "bg-emerald-950/60 border-emerald-500/50 text-emerald-300"
                : "bg-slate-900/60 border-slate-700 text-slate-400 hover:text-slate-200"
            }`}
            title="Har 40 soniyada kayfiyat va holatni avtomatik kuzatish"
          >
            <RefreshCw
              className={`w-3 h-3 ${autoScanEnabled ? "animate-spin" : ""}`}
            />
            <span>Avto: {autoScanEnabled ? "ON" : "OFF"}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
