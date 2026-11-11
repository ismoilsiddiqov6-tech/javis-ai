import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Chess, Square, Move } from "chess.js";
import {
  RotateCcw,
  Sparkles,
  Trophy,
  Volume2,
  AlertTriangle,
  Play,
  Swords,
  Layers,
  HelpCircle,
} from "lucide-react";
import { sounds } from "../utils/audioSynthesizer.ts";
import { speechService } from "../utils/speechService.ts";

export type ChessLevel = "boshlovchi" | "o'rta" | "kuchli";
export type PlayerColor = "w" | "b";

interface ChessGameProps {
  onJarvisSpeak: (text: string) => void;
  onSendChatMessage: (text: string) => void;
  initialPlayerColor?: PlayerColor;
  initialLevel?: ChessLevel;
}

// Evaluation piece values for minimax
const PIECE_VALUES: Record<string, number> = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 20000,
};

// Piece square bonus for center control & development
const PAWN_TABLE = [
  0,  0,  0,  0,  0,  0,  0,  0,
  50, 50, 50, 50, 50, 50, 50, 50,
  10, 10, 20, 30, 30, 20, 10, 10,
  5,  5, 10, 25, 25, 10,  5,  5,
  0,  0,  0, 20, 20,  0,  0,  0,
  5, -5,-10,  0,  0,-10, -5,  5,
  5, 10, 10,-20,-20, 10, 10,  5,
  0,  0,  0,  0,  0,  0,  0,  0
];

const KNIGHT_TABLE = [
  -50,-40,-30,-30,-30,-30,-40,-50,
  -40,-20,  0,  0,  0,  0,-20,-40,
  -30,  0, 10, 15, 15, 10,  0,-30,
  -30,  5, 15, 20, 20, 15,  5,-30,
  -30,  0, 15, 20, 20, 15,  0,-30,
  -30,  5, 10, 15, 15, 10,  5,-30,
  -40,-20,  0,  5,  5,  0,-20,-40,
  -50,-40,-30,-30,-30,-30,-40,-50,
];

// SVG chess piece symbols
const PIECE_SYMBOLS: Record<string, { symbol: string; label: string }> = {
  wp: { symbol: "♙", label: "Oq piyoda" },
  wn: { symbol: "♘", label: "Oq ot" },
  wb: { symbol: "♗", label: "Oq fil" },
  wr: { symbol: "♖", label: "Oq ruh" },
  wq: { symbol: "♕", label: "Oq farzin" },
  wk: { symbol: "♔", label: "Oq shoh" },
  bp: { symbol: "♟", label: "Qora piyoda" },
  bn: { symbol: "♞", label: "Qora ot" },
  bb: { symbol: "♝", label: "Qora fil" },
  br: { symbol: "♜", label: "Qora ruh" },
  bq: { symbol: "♛", label: "Qora farzin" },
  bk: { symbol: "♚", label: "Qora shoh" },
};

export const ChessGame: React.FC<ChessGameProps> = ({
  onJarvisSpeak,
  onSendChatMessage,
  initialPlayerColor = "w",
  initialLevel = "o'rta",
}) => {
  const [chess] = useState<Chess>(() => new Chess());
  const [, setTick] = useState(0); // force re-render
  const [playerColor, setPlayerColor] = useState<PlayerColor>(initialPlayerColor);
  const [level, setLevel] = useState<ChessLevel>(initialLevel);
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(null);
  const [jarvisComment, setJarvisComment] = useState<string>(
    "Shaxmat o'yiniga xush kelibsiz, janob. Sizning rangiz va darajangiz bo'yicha tayyorman."
  );
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [gameOutcome, setGameOutcome] = useState<string | null>(null);
  const [voiceMoveInput, setVoiceMoveInput] = useState("");

  const refreshBoard = useCallback(() => {
    setTick((t) => t + 1);
  }, []);

  // Board squares according to orientation
  const squares: Square[] = useMemo(() => {
    const files = ["a", "b", "c", "d", "e", "f", "g", "h"];
    const ranks = ["8", "7", "6", "5", "4", "3", "2", "1"];

    const orderedFiles = playerColor === "w" ? files : [...files].reverse();
    const orderedRanks = playerColor === "w" ? ranks : [...ranks].reverse();

    const sqs: Square[] = [];
    for (const r of orderedRanks) {
      for (const f of orderedFiles) {
        sqs.push(`${f}${r}` as Square);
      }
    }
    return sqs;
  }, [playerColor]);

  // Valid moves for current selected piece
  const legalMovesForSelected = useMemo(() => {
    if (!selectedSquare) return [];
    return chess
      .moves({ square: selectedSquare, verbose: true })
      .map((m) => m.to);
  }, [selectedSquare, chess]);

  // Check state
  const isCheck = chess.isCheck();
  const isGameOver = chess.isGameOver();

  // Evaluate board for minimax
  const evaluateBoard = useCallback((game: Chess) => {
    let totalScore = 0;
    const board = game.board();

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c];
        if (!piece) continue;

        const val = PIECE_VALUES[piece.type] || 0;
        let posBonus = 0;
        const index = r * 8 + c;

        if (piece.type === "p") {
          posBonus = piece.color === "w" ? PAWN_TABLE[index] : PAWN_TABLE[63 - index];
        } else if (piece.type === "n") {
          posBonus = piece.color === "w" ? KNIGHT_TABLE[index] : KNIGHT_TABLE[63 - index];
        }

        const score = val + posBonus;
        totalScore += piece.color === "w" ? score : -score;
      }
    }
    return totalScore;
  }, []);

  // Minimax with alpha-beta pruning
  const minimax = useCallback(
    (
      game: Chess,
      depth: number,
      alpha: number,
      beta: number,
      isMaximizing: boolean
    ): number => {
      if (depth === 0 || game.isGameOver()) {
        return evaluateBoard(game);
      }

      const moves = game.moves({ verbose: true });
      if (isMaximizing) {
        let maxEval = -Infinity;
        for (const move of moves) {
          game.move(move);
          const evaluation = minimax(game, depth - 1, alpha, beta, false);
          game.undo();
          maxEval = Math.max(maxEval, evaluation);
          alpha = Math.max(alpha, evaluation);
          if (beta <= alpha) break;
        }
        return maxEval;
      } else {
        let minEval = Infinity;
        for (const move of moves) {
          game.move(move);
          const evaluation = minimax(game, depth - 1, alpha, beta, true);
          game.undo();
          minEval = Math.min(minEval, evaluation);
          beta = Math.min(beta, evaluation);
          if (beta <= alpha) break;
        }
        return minEval;
      }
    },
    [evaluateBoard]
  );

  // Ask Gemini for witty JARVIS commentary
  const fetchJarvisCommentary = useCallback(
    async (lastPlayedMove: string) => {
      try {
        const isCheckmate = chess.isCheckmate();
        const isDraw = chess.isDraw();
        const check = chess.isCheck();

        const res = await fetch("/api/chess/commentary", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fen: chess.fen(),
            lastMove: lastPlayedMove,
            level,
            isCheck: check,
            isCheckmate,
            isDraw,
            moveHistory: chess.history(),
          }),
        });
        const data = await res.json();
        if (data.comment) {
          setJarvisComment(data.comment);
          onJarvisSpeak(data.comment);
        }
      } catch {
        // Fallback natural comments
        if (chess.isCheckmate()) {
          const winText = "Mot bo'ldi, janob. Ajoyib partiya bo'ldi!";
          setJarvisComment(winText);
          onJarvisSpeak(winText);
        } else if (chess.isCheck()) {
          sounds.playCheckAlert();
          const checkText = "Shoh, janob! Ehtiyot bo'ling.";
          setJarvisComment(checkText);
          onJarvisSpeak(checkText);
        }
      }
    },
    [chess, level, onJarvisSpeak]
  );

  // JARVIS AI Move generator
  const makeAiMove = useCallback(async () => {
    if (chess.isGameOver()) return;
    setIsAiThinking(true);

    // Realistic delay simulating calculation
    const delay = level === "boshlovchi" ? 600 : level === "o'rta" ? 1100 : 1600;
    await new Promise((r) => setTimeout(r, delay));

    const legalMoves = chess.moves({ verbose: true });
    if (legalMoves.length === 0) {
      setIsAiThinking(false);
      return;
    }

    let selectedMove: Move;

    if (level === "boshlovchi") {
      // Novice: mostly random, sometimes captures
      const captures = legalMoves.filter((m) => m.captured);
      if (captures.length > 0 && Math.random() < 0.6) {
        selectedMove = captures[Math.floor(Math.random() * captures.length)];
      } else {
        selectedMove = legalMoves[Math.floor(Math.random() * legalMoves.length)];
      }
    } else {
      // Intermediate / Strong minimax
      const isWhite = chess.turn() === "w";
      const searchDepth = level === "kuchli" ? 3 : 2;

      let bestScore = isWhite ? -Infinity : Infinity;
      let candidateMoves: Move[] = [];

      for (const move of legalMoves) {
        chess.move(move);
        const score = minimax(
          chess,
          searchDepth - 1,
          -Infinity,
          Infinity,
          !isWhite
        );
        chess.undo();

        if (isWhite) {
          if (score > bestScore) {
            bestScore = score;
            candidateMoves = [move];
          } else if (score === bestScore) {
            candidateMoves.push(move);
          }
        } else {
          if (score < bestScore) {
            bestScore = score;
            candidateMoves = [move];
          } else if (score === bestScore) {
            candidateMoves.push(move);
          }
        }
      }

      selectedMove =
        candidateMoves[Math.floor(Math.random() * candidateMoves.length)] ||
        legalMoves[0];
    }

    const executed = chess.move(selectedMove);
    sounds.playChessMove();
    setLastMove({ from: executed.from, to: executed.to });
    refreshBoard();
    setIsAiThinking(false);

    // Audio / Voice commentary
    if (chess.isCheckmate()) {
      setGameOutcome("JARVIS g'alaba qozondi!");
      sounds.playCheckAlert();
    } else if (chess.isDraw()) {
      setGameOutcome("Durrang (Pat yoki yetarli bo'lmagan donalar)");
    } else if (chess.isCheck()) {
      sounds.playCheckAlert();
    }

    fetchJarvisCommentary(`${executed.from}-${executed.to} (${executed.san})`);
  }, [chess, level, minimax, refreshBoard, fetchJarvisCommentary]);

  // Handle Square Click
  const handleSquareClick = async (sq: Square) => {
    if (isAiThinking || chess.isGameOver()) return;

    // Check if it's player's turn
    const isPlayerTurn = chess.turn() === playerColor;
    if (!isPlayerTurn) return;

    const piece = chess.get(sq);

    // If already clicked a piece and clicking target square
    if (selectedSquare) {
      if (selectedSquare === sq) {
        setSelectedSquare(null);
        return;
      }

      try {
        const move = chess.move({
          from: selectedSquare,
          to: sq,
          promotion: "q",
        });

        if (move) {
          sounds.playChessMove();
          setLastMove({ from: move.from, to: move.to });
          setSelectedSquare(null);
          refreshBoard();

          if (chess.isCheckmate()) {
            setGameOutcome("Tabriklayman janob, siz g'alaba qozondingiz!");
            sounds.playPowerUp();
          } else if (chess.isDraw()) {
            setGameOutcome("O'yin durrang bilan yakunlandi.");
          }

          fetchJarvisCommentary(`${move.from}-${move.to} (${move.san})`);

          // Trigger AI Move
          if (!chess.isGameOver()) {
            setTimeout(() => {
              makeAiMove();
            }, 300);
          }
          return;
        }
      } catch {
        // illegal move attempt, see if clicking another of own pieces
      }
    }

    // Select piece if it belongs to current player
    if (piece && piece.color === playerColor) {
      setSelectedSquare(sq);
      sounds.playChirp();
    } else {
      setSelectedSquare(null);
    }
  };

  // If player chose black, AI plays first move
  useEffect(() => {
    if (playerColor === "b" && chess.turn() === "w" && chess.history().length === 0) {
      makeAiMove();
    }
  }, [playerColor, chess, makeAiMove]);

  // Restart Game
  const resetGame = (newColor: PlayerColor = playerColor) => {
    chess.reset();
    setPlayerColor(newColor);
    setSelectedSquare(null);
    setLastMove(null);
    setGameOutcome(null);
    const startMsg = `Yangi o'yin boshlandi, janob. Siz ${
      newColor === "w" ? "oq" : "qora"
    } donalardasiz. Daraja: ${level}. Omad!`;
    setJarvisComment(startMsg);
    onJarvisSpeak(startMsg);
    refreshBoard();
  };

  // Parse voice move (e.g., "e2 e4", "ot f3", "e4", "fil c4")
  const handleVoiceMoveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const input = voiceMoveInput.trim().toLowerCase();
    if (!input) return;

    // Normalizing Uzbek piece names to SAN
    // ot -> N, fil -> B, ruh/to'ra -> R, farzin -> Q, shoh -> K
    let normalized = input
      .replace(/ot\s*/gi, "N")
      .replace(/fil\s*/gi, "B")
      .replace(/(ruh|to'ra)\s*/gi, "R")
      .replace(/farzin\s*/gi, "Q")
      .replace(/shoh\s*/gi, "K")
      .replace(/\s*ga\b/gi, "")
      .replace(/\s+/g, "");

    try {
      const move = chess.move(normalized);
      if (move) {
        sounds.playChessMove();
        setLastMove({ from: move.from, to: move.to });
        setSelectedSquare(null);
        refreshBoard();
        setVoiceMoveInput("");
        fetchJarvisCommentary(`${move.from}-${move.to}`);

        if (!chess.isGameOver()) {
          setTimeout(() => makeAiMove(), 400);
        }
        return;
      }
    } catch {
      // Try from-to pattern like e2e4 or e2-e4
      const match = input.match(/([a-h][1-8])\s*[-—–]?\s*([a-h][1-8])/i);
      if (match) {
        try {
          const move = chess.move({
            from: match[1] as Square,
            to: match[2] as Square,
            promotion: "q",
          });
          if (move) {
            sounds.playChessMove();
            setLastMove({ from: move.from, to: move.to });
            setSelectedSquare(null);
            refreshBoard();
            setVoiceMoveInput("");
            fetchJarvisCommentary(`${move.from}-${move.to}`);
            if (!chess.isGameOver()) {
              setTimeout(() => makeAiMove(), 400);
            }
            return;
          }
        } catch {}
      }
    }

    setJarvisComment("Kechirasiz janob, bu yurish qoidalarga to'g'ri kelmadi yoki noaniq bo'ldi.");
  };

  return (
    <div className="flex flex-col bg-slate-950/90 border border-cyan-500/30 rounded-xl overflow-hidden hud-corner shadow-[0_0_25px_rgba(6,182,212,0.15)]">
      {/* Top Game Header */}
      <div className="flex flex-wrap items-center justify-between px-4 py-3 bg-slate-900/90 border-b border-cyan-500/20 gap-3">
        <div className="flex items-center gap-2">
          <Swords className="w-5 h-5 text-cyan-400 animate-pulse" />
          <span className="font-hud uppercase tracking-wider font-semibold text-cyan-200 text-sm">
            Taktik Shaxmat Maydoni
          </span>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/30 text-cyan-300">
            {chess.turn() === "w" ? "Oqlar navbati" : "Qoralar navbati"}
          </span>
        </div>

        {/* Level Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-mono">Daraja:</span>
          {(["boshlovchi", "o'rta", "kuchli"] as ChessLevel[]).map((lvl) => (
            <button
              key={lvl}
              onClick={() => {
                setLevel(lvl);
                sounds.playChirp();
              }}
              className={`px-2 py-1 rounded text-[11px] font-mono capitalize transition cursor-pointer border ${
                level === lvl
                  ? "bg-cyan-600/30 border-cyan-400 text-cyan-200 shadow-[0_0_10px_rgba(6,182,212,0.4)]"
                  : "bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200"
              }`}
            >
              {lvl}
            </button>
          ))}
        </div>
      </div>

      {/* Main Board & HUD Sidebar layout */}
      <div className="flex flex-col lg:flex-row p-4 gap-5 items-center justify-center">
        {/* Chessboard Viewport */}
        <div className="relative flex flex-col items-center">
          <div className="grid grid-cols-8 grid-rows-8 w-[320px] h-[320px] sm:w-[380px] sm:h-[380px] border-2 border-cyan-500/40 rounded-lg overflow-hidden shadow-[0_0_30px_rgba(6,182,212,0.2)] bg-slate-950">
            {squares.map((sq, idx) => {
              const file = sq[0];
              const rank = sq[1];
              const isDark = (file.charCodeAt(0) + parseInt(rank)) % 2 === 1;
              const piece = chess.get(sq);
              const isSelected = selectedSquare === sq;
              const isLegal = legalMovesForSelected.includes(sq);
              const isLastMoveSquare =
                lastMove && (lastMove.from === sq || lastMove.to === sq);
              const isKingInCheck =
                isCheck &&
                piece &&
                piece.type === "k" &&
                piece.color === chess.turn();

              return (
                <button
                  key={sq}
                  onClick={() => handleSquareClick(sq)}
                  className={`relative flex items-center justify-center text-2xl sm:text-3xl select-none transition-colors cursor-pointer group ${
                    isKingInCheck
                      ? "bg-red-600/60 animate-pulse"
                      : isSelected
                      ? "bg-cyan-500/40 shadow-inner"
                      : isLastMoveSquare
                      ? "bg-amber-500/25"
                      : isDark
                      ? "bg-slate-900/90 hover:bg-slate-800"
                      : "bg-slate-800/50 hover:bg-slate-700/60"
                  }`}
                  title={`${sq} ${piece ? `(${piece.color} ${piece.type})` : ""}`}
                >
                  {/* Square coordinate tags on edges */}
                  {idx % 8 === 0 && (
                    <span className="absolute top-0.5 left-1 text-[9px] font-mono text-cyan-400/40 pointer-events-none">
                      {rank}
                    </span>
                  )}
                  {idx >= 56 && (
                    <span className="absolute bottom-0.5 right-1 text-[9px] font-mono text-cyan-400/40 pointer-events-none">
                      {file}
                    </span>
                  )}

                  {/* Legal move destination indicator */}
                  {isLegal && (
                    <div
                      className={`absolute rounded-full pointer-events-none ${
                        piece
                          ? "w-7 h-7 border-2 border-emerald-400/80 animate-ping"
                          : "w-2.5 h-2.5 bg-emerald-400 shadow-[0_0_8px_#34d399]"
                      }`}
                    />
                  )}

                  {/* Piece Representation */}
                  {piece && (
                    <span
                      className={`transform transition-transform group-hover:scale-110 drop-shadow-md font-serif ${
                        piece.color === "w"
                          ? "text-cyan-100 filter drop-shadow-[0_0_4px_rgba(255,255,255,0.7)]"
                          : "text-amber-400 filter drop-shadow-[0_0_5px_rgba(245,158,11,0.6)]"
                      }`}
                    >
                      {PIECE_SYMBOLS[`${piece.color}${piece.type}`]?.symbol || piece.type}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* AI Thinking Indicator Banner */}
          {isAiThinking && (
            <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-[2px] rounded-lg flex flex-col items-center justify-center gap-2 pointer-events-none">
              <div className="w-10 h-10 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
              <span className="text-xs font-mono text-cyan-300 uppercase tracking-widest bg-black/80 px-3 py-1 rounded border border-cyan-500/40">
                JARVIS hisoblamoqda...
              </span>
            </div>
          )}
        </div>

        {/* Sidebar Controls & Commentary */}
        <div className="flex flex-col flex-1 w-full max-w-sm space-y-3">
          {/* JARVIS Live Commentary Box */}
          <div className="p-3.5 rounded-lg bg-slate-900/80 border border-cyan-500/30 relative">
            <div className="flex items-center justify-between text-xs font-mono text-cyan-400 mb-1">
              <span className="flex items-center gap-1.5 font-hud">
                <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
                JARVIS Taktik Izohi
              </span>
              <button
                onClick={() => speechService.speak(jarvisComment)}
                className="hover:text-cyan-200 transition cursor-pointer"
                title="Qaytadan eshitish"
              >
                <Volume2 className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-xs text-slate-200 italic leading-relaxed">
              "{jarvisComment}"
            </p>
          </div>

          {/* Game Outcome Alert */}
          {gameOutcome && (
            <div className="p-3 rounded-lg bg-amber-950/40 border border-amber-500/50 flex items-center gap-2.5 text-amber-200 text-xs">
              <Trophy className="w-5 h-5 text-amber-400 shrink-0" />
              <div>
                <div className="font-bold">{gameOutcome}</div>
                <div className="text-[11px] text-amber-300/80">
                  O'yin tugadi. Yangisini boshlash uchun quyidagi tugmani bosing.
                </div>
              </div>
            </div>
          )}

          {/* Move History / Notation List */}
          <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 text-xs font-mono max-h-24 overflow-y-auto">
            <div className="text-slate-500 text-[10px] mb-1 uppercase tracking-wider flex items-center justify-between">
              <span>Yurishlar jurnali ({chess.history().length})</span>
              <span>FEN: FIDE qoidalari</span>
            </div>
            <div className="flex flex-wrap gap-1.5 text-slate-300">
              {chess.history().length === 0 ? (
                <span className="text-slate-600 italic">Hali yurish qilinmadi</span>
              ) : (
                chess.history().map((m, i) => (
                  <span
                    key={i}
                    className={`px-1.5 py-0.5 rounded text-[11px] ${
                      i % 2 === 0
                        ? "bg-cyan-950/60 text-cyan-300 border border-cyan-800/40"
                        : "bg-amber-950/60 text-amber-300 border border-amber-800/40"
                    }`}
                  >
                    {Math.floor(i / 2) + 1}.{i % 2 === 0 ? "" : ".."} {m}
                  </span>
                ))
              )}
            </div>
          </div>

          {/* Voice Move or Text Command Input */}
          <form onSubmit={handleVoiceMoveSubmit} className="flex gap-2">
            <input
              type="text"
              value={voiceMoveInput}
              onChange={(e) => setVoiceMoveInput(e.target.value)}
              placeholder="Masalan: e2-e4 yoki ot f3..."
              className="flex-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-cyan-500/30 text-xs font-mono text-cyan-200 placeholder-slate-500 focus:outline-none focus:border-cyan-400"
            />
            <button
              type="submit"
              disabled={isAiThinking}
              className="px-3 py-1.5 rounded-lg bg-cyan-600/30 border border-cyan-400/50 hover:bg-cyan-500/40 text-cyan-200 text-xs font-hud uppercase cursor-pointer disabled:opacity-40"
            >
              Yurish
            </button>
          </form>

          {/* Game Controls Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800">
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400 font-mono">Dona:</span>
              <button
                onClick={() => resetGame("w")}
                className={`px-2 py-1 rounded text-xs font-mono border cursor-pointer ${
                  playerColor === "w"
                    ? "bg-cyan-600/30 border-cyan-400 text-cyan-200"
                    : "bg-slate-900 border-slate-700 text-slate-400"
                }`}
              >
                Oq
              </button>
              <button
                onClick={() => resetGame("b")}
                className={`px-2 py-1 rounded text-xs font-mono border cursor-pointer ${
                  playerColor === "b"
                    ? "bg-amber-600/30 border-amber-400 text-amber-200"
                    : "bg-slate-900 border-slate-700 text-slate-400"
                }`}
              >
                Qora
              </button>
            </div>

            <button
              onClick={() => resetGame(playerColor)}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs border border-slate-700 transition cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Qayta boshlash</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
