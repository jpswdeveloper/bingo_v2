'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Settings, ArrowLeft, Loader2, Bug } from 'lucide-react';
import Link from 'next/link';
import { useBingoSocket } from '@/lib/use-bingo-socket';
import { useMyTickets, useMultipleCards, matrixToGrid, getColumnForNumber, useUserProfile } from '@/lib/use-active-game';
import { useTelegramWebApp } from '@/lib/use-telegram';
import { gameApi } from '@/lib/api-client';
import { secondsRemaining } from '@/lib/date-utils';
import type { GameState, NumberDrawnPayload, GameOverPayload, BingoCard } from '@/lib/types';
import { GamePhase } from '@/lib/types';

const IS_DEV = process.env.NODE_ENV === 'development';

// ─── Column colour maps ───────────────────────────────────────
const COL_HEADER: Record<string, string> = {
  B: 'text-cyan-400 border-cyan-400 shadow-[0_0_8px_rgba(76,215,246,0.8)]',
  I: 'text-purple-400 border-purple-400 shadow-[0_0_8px_rgba(183,109,255,0.8)]',
  N: 'text-pink-400 border-pink-400 shadow-[0_0_8px_rgba(236,72,153,0.8)]',
  G: 'text-yellow-400 border-yellow-400 shadow-[0_0_8px_rgba(239,194,0,0.8)]',
  O: 'text-orange-400 border-orange-400 shadow-[0_0_8px_rgba(251,146,60,0.8)]',
};

const COL_MARKED: Record<string, string> = {
  B: 'bg-cyan-400 text-black shadow-[0_0_25px_rgba(76,215,246,0.5)]',
  I: 'bg-purple-400 text-black shadow-[0_0_25px_rgba(183,109,255,0.5)]',
  N: 'bg-pink-400 text-black shadow-[0_0_25px_rgba(236,72,153,0.5)]',
  G: 'bg-yellow-400 text-black shadow-[0_0_25px_rgba(239,194,0,0.5)]',
  O: 'bg-orange-400 text-black shadow-[0_0_25px_rgba(251,146,60,0.5)]',
};

const COLS = ['B', 'I', 'N', 'G', 'O'] as const;

export default function GamePage() {
  const params = useParams();
  const router = useRouter();
  const gameId = params.id as string;

  // ── Telegram identity ────────────────────────────────────────
  const { user: tgUser, webApp } = useTelegramWebApp();
  const { data: userProfile } = useUserProfile(tgUser?.telegramId ?? null);

  // ── State ────────────────────────────────────────────────────
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [drawnNumbers, setDrawnNumbers] = useState<number[]>([]);
  const [currentDraw, setCurrentDraw] = useState<number | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [gameOver, setGameOver] = useState<GameOverPayload | null>(null);
  const [newBallFlash, setNewBallFlash] = useState(false);
  const [bingoResult, setBingoResult] = useState<{ valid: boolean; message: string } | null>(null);
  const [isWinner, setIsWinner] = useState(false);
  const [gameOverDismissed, setGameOverDismissed] = useState(false);
  const [nextDrawCountdown, setNextDrawCountdown] = useState<number | null>(null);
  const [showDebug, setShowDebug] = useState(false);

  // ── Debug log (ring buffer — keep last 30 events) ─────────────
  const debugLog = useRef<{ t: string; ev: string; data?: string }[]>([]);
  const addDebugLog = useCallback((ev: string, data?: unknown) => {
    const entry = {
      t: new Date().toISOString().slice(11, 23),
      ev,
      data: data !== undefined ? JSON.stringify(data).slice(0, 120) : undefined,
    };
    debugLog.current = [entry, ...debugLog.current].slice(0, 30);
    if (IS_DEV) console.log(`[WS:${ev}]`, data ?? '');
  }, []);

  // ── Fetch Tickets & Cards ────────────────────────────────────
  // isFetching stays true during background refetches (unlike isLoading which
  // is only true on the very first fetch). We use it to suppress the overlay
  // while a revalidation is in flight — avoids the flash after purchase.
  const { data: myTickets, isLoading: myTicketsLoading, isFetching: myTicketsFetching } = useMyTickets(tgUser?.telegramId ?? null);
  const cardNumbers = useMemo(() => myTickets?.map((t) => t.cardNumber) ?? [], [myTickets]);
  const cardQueries = useMultipleCards(cardNumbers);
  
  const myCards = useMemo(() => {
    return cardQueries.map(q => q.data).filter(Boolean) as BingoCard[];
  }, [cardQueries]);

  // Refs for animations
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ballRef = useRef<HTMLDivElement>(null);

  // ── WebSocket ────────────────────────────────────────────────
  const { isConnected, claimBingo, requestState } = useBingoSocket({
    gameId,
    userId: userProfile?.id,
    onGameState: (state) => {
      addDebugLog('game:state', { phase: state.phase, drawn: state.drawnNumbers.length, sold: state.soldCount });
      setGameState(state);
      setDrawnNumbers(state.drawnNumbers);
      setCurrentDraw(state.currentDraw);
    },
    onNumberDrawn: (payload: NumberDrawnPayload) => {
      addDebugLog('game:draw', { number: payload.drawnNumber, total: payload.drawCount });
      setDrawnNumbers(payload.allDrawn);
      setCurrentDraw(payload.drawnNumber);
      setNewBallFlash(true);
      setTimeout(() => setNewBallFlash(false), 600);
      setNextDrawCountdown(gameState?.drawIntervalSeconds ?? 5);
    },
    onPhaseChange: (payload) => {
      addDebugLog('game:phase', { phase: payload.phase, countdown: payload.countdownSeconds });
      setGameState((prev) =>
        prev ? {
          ...prev,
          phase: payload.phase,
          countdownSeconds: payload.countdownSeconds,
          countdownStartedAt: payload.countdownStartedAt ?? null,
        } : null,
      );
      if (payload.phase === GamePhase.COUNTDOWN) {
        // Compute remaining time from server's countdownStartedAt if available,
        // otherwise fall back to the full countdownSeconds value.
        if (payload.countdownStartedAt) {
          setCountdown(secondsRemaining(payload.countdownStartedAt, payload.countdownSeconds));
        } else {
          setCountdown(payload.countdownSeconds);
        }
      }
      if (payload.phase === GamePhase.DRAWING) {
        setCountdown(null);
      }
    },
    onGameOver: (payload) => {
      addDebugLog('game:over', { winner: payload.winnerId, card: payload.winningCardNumber });
      setGameOver(payload);
      if (payload.winnerId && userProfile && payload.winnerId === userProfile.id) {
        setIsWinner(true);
        webApp?.HapticFeedback?.notificationOccurred('success');
        webApp?.showAlert('🏆 Congratulations! YOU WON! Check your wallet for winnings.');
      } else if (payload.winnerId) {
        webApp?.HapticFeedback?.notificationOccurred('warning');
      }
    },
    onInvalidClaim: (payload) => {
      addDebugLog('game:invalid_claim', payload);
      setBingoResult({ valid: false, message: 'Not a valid win yet. Keep playing!' });
      webApp?.HapticFeedback?.notificationOccurred('error');
      setTimeout(() => setBingoResult(null), 3000);
    },
    onError: (err) => {
      addDebugLog('error', err);
      console.error('[WS]', err.message);
    },
  });

  // ── Countdown timer ─────────────────────────────────────────
  useEffect(() => {
    if (countdown === null || countdown <= 0) return;
    const t = setInterval(
      () => setCountdown((p) => (p !== null && p > 0 ? p - 1 : 0)),
      1000,
    );
    return () => clearInterval(t);
  }, [countdown]);

  useEffect(() => {
    if (nextDrawCountdown === null || nextDrawCountdown <= 0) return;
    const t = setInterval(
      () => setNextDrawCountdown((p) => (p !== null && p > 0 ? p - 1 : 0)),
      1000,
    );
    return () => clearInterval(t);
  }, [nextDrawCountdown]);

  // ── Seed initial state from REST ────────────────────────────
  useEffect(() => {
    console.log('[Game] init: fetching active game for gameId:', gameId);
    gameApi.getActiveGame().then((state) => {
      console.log('[Game] init: getActiveGame returned:', state ? state.phase : 'null');
      if (!state) {
        // No active game — but only redirect if we haven't received a WS state
        // (the game may have just ended and the game-over overlay is already showing)
        addDebugLog('init', 'no active game');
        setGameState((prev) => {
          if (!prev) {
            // Nothing from WS either — nothing to show, go home
            console.log('[Game] no WS state either → redirect to /');
            router.replace('/');
          }
          return prev;
        });
        return;
      }
      if (state.gameId === gameId) {
        addDebugLog('init', { phase: state.phase, drawn: state.drawnNumbers.length });
        setGameState(state);
        setDrawnNumbers(state.drawnNumbers);
        setCurrentDraw(state.currentDraw);
        if (state.phase === GamePhase.COUNTDOWN && state.countdownStartedAt) {
          setCountdown(secondsRemaining(state.countdownStartedAt, state.countdownSeconds));
        } else if (state.phase === GamePhase.COUNTDOWN) {
          setCountdown(state.countdownSeconds);
        }
      } else {
        addDebugLog('init', `wrong game → /game/${state.gameId}`);
        router.replace(`/game/${state.gameId}`);
      }
    }).catch((err) => {
      addDebugLog('init:error', err?.message);
      console.error('[Game] init error:', err);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId]);

  // ── WebGL shader background ──────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const syncSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', syncSize);
    syncSize();
    const gl = canvas.getContext('webgl') as WebGLRenderingContext | null;
    if (!gl) return;
    const vs = `attribute vec2 a_position;void main(){gl_Position=vec4(a_position,0.0,1.0);}`;
    const fs = `precision highp float;uniform float u_time;uniform vec2 u_resolution;void main(){vec2 uv=gl_FragCoord.xy/u_resolution.xy;vec3 c1=vec3(0.086,0.067,0.106);vec3 c2=vec3(0.043,0.031,0.051);float n=sin(uv.x*3.0+u_time*0.5)*cos(uv.y*2.0+u_time*0.4);vec3 base=mix(c1,c2,uv.y+n*0.2);float p=sin(u_time*0.8)*0.5+0.5;vec3 neon=vec3(0.659,0.333,0.969)*0.03*p;gl_FragColor=vec4(base+neon,1.0);}`;
    const mkShader = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src); gl.compileShader(s); return s;
    };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, mkShader(gl.VERTEX_SHADER, vs));
    gl.attachShader(prog, mkShader(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(prog); gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,1,1]), gl.STATIC_DRAW);
    const pos = gl.getAttribLocation(prog, 'a_position');
    gl.enableVertexAttribArray(pos);
    gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);
    const uTime = gl.getUniformLocation(prog, 'u_time');
    const uRes  = gl.getUniformLocation(prog, 'u_resolution');
    let rafId: number;
    const render = (t: number) => {
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform1f(uTime, t * 0.001);
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      rafId = requestAnimationFrame(render);
    };
    rafId = requestAnimationFrame(render);
    return () => { window.removeEventListener('resize', syncSize); cancelAnimationFrame(rafId); };
  }, []);

  // ── Helpers ──────────────────────────────────────────────────
  const formatTime = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const currentLetter = currentDraw ? getColumnForNumber(currentDraw) : null;

  const recentBalls = [...drawnNumbers].reverse().slice(0, 4).map((n) => ({
    number: n,
    letter: getColumnForNumber(n),
  }));

  const handleClaimBingo = useCallback((cardNumber: number) => {
    addDebugLog('claim:bingo', { cardNumber });
    claimBingo(cardNumber);
    webApp?.HapticFeedback?.impactOccurred('heavy');
    setBingoResult(null);
  }, [claimBingo, webApp, addDebugLog]);

  // Calculated prize = sold cards × ticket price
  const prizePot = (gameState?.soldCount ?? 0) * (gameState?.ticketPrice ?? 0);
  const prizeDisplay = prizePot > 0 ? prizePot.toFixed(2) : '—';

  // Full Board Matrix Generation (columns x 15 rows)
  const fullBoard = COLS.map((col, colIdx) => {
    return Array.from({ length: 15 }, (_, i) => colIdx * 15 + i + 1);
  });

  // ── Ticket state ─────────────────────────────────────────────
  // ticketsReady = true only when:
  //   1. Telegram SDK has resolved (tgUser known)
  //   2. The query was actually enabled (telegramId existed)
  //   3. No fetch is currently in flight (initial or background revalidation)
  // This prevents the "No Cards Yet" overlay flashing before the SDK or
  // the network response has had a chance to load.
  const telegramReady = !!tgUser?.telegramId;
  const ticketsReady = telegramReady && !myTicketsLoading && !myTicketsFetching;
  const hasTickets = (myTickets?.length ?? 0) > 0;

  return (
    <div className="h-screen bg-[#0b080d] flex flex-col relative overflow-hidden font-sans">
      {/* WebGL Shader Background */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full -z-10" />

      {/* ── No-ticket overlay: only shown once fetch is fully settled + confirmed empty */}
      {ticketsReady && !hasTickets && (
        gameState?.phase === GamePhase.CARD_SELECTION ||
        gameState?.phase === GamePhase.COUNTDOWN
      ) && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md">
          <div className="glass-panel rounded-3xl p-10 text-center max-w-sm mx-4 border border-purple-500/20">
            <div className="text-5xl mb-4">🎟️</div>
            <h2 className="text-2xl font-black text-white mb-2">No Cards Yet</h2>
            <p className="text-gray-400 text-sm mb-6">
              {gameState?.phase === GamePhase.CARD_SELECTION
                ? "You haven't purchased a card. Pick one before the window closes."
                : "Purchase window is closing — pick a card quickly!"}
            </p>
            <Link
              href="/pick-card"
              className="inline-block bg-purple-500 hover:bg-purple-600 text-white font-bold px-8 py-3 rounded-xl transition-all"
            >
              Pick a Card
            </Link>
          </div>
        </div>
      )}

      {/* Game Over Overlay */}
      {gameOver && !gameOverDismissed && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md">
          <div className="relative glass-panel rounded-3xl p-10 text-center max-w-md mx-4 border border-white/10">
            <button
              onClick={() => setGameOverDismissed(true)}
              className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
              aria-label="Close"
            >
              ✕
            </button>
            <div className="text-6xl mb-4">{isWinner ? '🏆' : gameOver.winnerId ? '🥲' : '🎲'}</div>
            <h2 className="text-3xl font-black text-white mb-2">
              {isWinner ? 'You Won!' : gameOver.winnerId ? 'Better luck next time' : 'Game Over'}
            </h2>
            {isWinner && (
              <p className="text-yellow-400 font-bold mb-2 text-lg drop-shadow-[0_0_10px_rgba(239,194,0,0.5)]">
                Winnings sent to your wallet 🎉
              </p>
            )}
            {gameOver.winningCardNumber && (
              <p className="text-purple-300 text-sm mb-1">
                Winning card: #{gameOver.winningCardNumber}
              </p>
            )}
            <p className="text-gray-400 text-sm mb-8">
              {gameOver.totalDrawn} numbers drawn · {gameOver.gameCode}
            </p>
            <Link
              href="/"
              className="inline-block bg-purple-500 hover:bg-purple-600 text-white font-bold px-8 py-3 rounded-xl transition-all"
            >
              Back to Lobby
            </Link>
          </div>
        </div>
      )}

      {/* ── Debug panel (dev only, toggled via settings button) ─── */}
      {showDebug && (
        <div className="absolute bottom-20 left-2 right-2 md:left-auto md:right-4 md:w-96 z-50 bg-black/90 border border-yellow-500/30 rounded-xl p-3 text-[10px] font-mono text-yellow-300 max-h-64 overflow-y-auto">
          <div className="flex justify-between items-center mb-2 sticky top-0 bg-black/90 pb-1 border-b border-yellow-500/20">
            <span className="font-bold text-yellow-400 text-xs">🐛 DEBUG</span>
            <button onClick={() => setShowDebug(false)} className="text-gray-500 hover:text-white text-lg leading-none">×</button>
          </div>
          <div className="mb-2 grid grid-cols-2 gap-x-3 gap-y-0.5 text-gray-300">
            <span>phase:</span><span className="text-cyan-400">{gameState?.phase ?? '—'}</span>
            <span>ws:</span><span className={isConnected ? 'text-green-400' : 'text-red-400'}>{isConnected ? 'connected' : 'disconnected'}</span>
            <span>drawn:</span><span>{drawnNumbers.length}/75</span>
            <span>myCards:</span><span>{myTickets?.length ?? 0} (rdy:{String(ticketsReady)})</span>
            <span>countdown:</span><span>{countdown ?? '—'}</span>
            <span>nextDraw:</span><span>{nextDrawCountdown ?? '—'}</span>
            <span>prize:</span><span>{prizeDisplay} ETB</span>
            <span>userId:</span><span className="truncate">{userProfile?.id?.slice(-8) ?? '—'}</span>
          </div>
          <div className="border-t border-yellow-500/20 pt-1 space-y-0.5">
            {debugLog.current.map((e, i) => (
              <div key={i} className="flex gap-1">
                <span className="text-gray-600 shrink-0">{e.t}</span>
                <span className="text-yellow-400 shrink-0">{e.ev}</span>
                {e.data && <span className="text-gray-400 truncate">{e.data}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Top Bar ────────────────────────────────────────────── */}
      <header className="glass-panel mx-2 mt-2 md:mx-4 md:mt-4 rounded-xl border border-white/5 p-2 flex flex-wrap lg:flex-nowrap items-center justify-between gap-2 shrink-0 z-40">
        
        {/* Left Side: Game Stats */}
        <div className="flex items-center gap-2">
          {/* Back button */}
          <Link href="/" className="glass-panel p-2 rounded-lg text-gray-400 hover:text-white shrink-0 hidden md:block">
            <ArrowLeft className="w-5 h-5" />
          </Link>

          <div className="glass-panel px-3 py-1.5 md:px-4 md:py-2 rounded-lg text-center min-w-[70px]">
            <div className="text-[9px] md:text-[10px] text-gray-400 uppercase tracking-wider">ዙር (Round)</div>
            <div className="text-white font-bold text-xs md:text-sm">#{gameState?.gameCode ?? '—'}</div>
          </div>
          
          <div className="glass-panel px-3 py-1.5 md:px-4 md:py-2 rounded-lg text-center min-w-[70px]">
            <div className="text-[9px] md:text-[10px] text-gray-400 uppercase tracking-wider">መቁረጫ</div>
            <div className="text-white font-bold text-xs md:text-sm">{gameState ? `${gameState.ticketPrice.toFixed(2)}` : '—'}</div>
          </div>
          
          <div className="bg-cyan-500/10 border border-cyan-500/30 px-3 py-1.5 md:px-4 md:py-2 rounded-lg text-center min-w-[90px] shadow-[0_0_15px_rgba(76,215,246,0.15)]">
            <div className="text-[9px] md:text-[10px] text-cyan-400 uppercase tracking-wider">ሽልማት (Prize)</div>
            <div className="text-cyan-400 font-bold text-sm md:text-base">{prizeDisplay}</div>
          </div>
          
          <div className="glass-panel px-3 py-1.5 md:px-4 md:py-2 rounded-lg text-center min-w-[70px]">
            <div className="text-[9px] md:text-[10px] text-gray-400 uppercase tracking-wider">እጣ (Balls)</div>
            <div className="text-white font-bold text-xs md:text-sm">{drawnNumbers.length}/75</div>
          </div>
        </div>

        {/* Right Side: User & Actions */}
        <div className="flex items-center gap-2 ml-auto">
          {userProfile && (
            <div className="hidden sm:flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-1">
              <div className="text-right">
                <div className="text-[9px] text-gray-500 uppercase tracking-wider">{tgUser?.firstName}</div>
                <div className="text-cyan-400 font-bold text-xs">
                  {userProfile.walletBalance.toFixed(2)} ETB
                </div>
              </div>
            </div>
          )}
          <button
            onClick={() => setShowDebug((v) => !v)}
            title="Toggle debug panel"
            className={`glass-panel p-2 rounded-lg transition-all ${showDebug ? 'text-yellow-400' : 'text-gray-400 hover:text-white'}`}
          >
            <Bug className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* ── Main Layout ────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col md:flex-row gap-2 md:gap-4 p-2 md:p-4 min-h-0">
        
        {/* Left: Full Bingo Board (Mobile: hidden or tab, Desktop: visible) */}
        <section className="hidden md:flex flex-col w-[260px] shrink-0 glass-panel border border-white/5 rounded-xl p-3 overflow-y-auto custom-scrollbar">
          <div className="flex justify-between items-center mb-3 text-center font-black text-lg sticky top-0 bg-[#0b080d]/80 backdrop-blur z-10 py-1">
            {COLS.map((col) => (
              <div key={col} className={`w-full ${COL_HEADER[col].split(' ')[0]}`}>
                {col}
              </div>
            ))}
          </div>
          <div className="flex gap-1 justify-between flex-1">
            {fullBoard.map((colNumbers, colIdx) => (
              <div key={COLS[colIdx]} className="flex flex-col gap-1 w-full">
                {colNumbers.map((num) => {
                  const isMarked = drawnNumbers.includes(num);
                  const isNew = num === currentDraw;
                  return (
                    <div
                      key={num}
                      className={`h-7 w-full flex items-center justify-center rounded text-xs font-bold transition-all ${
                        isMarked 
                          ? `${COL_MARKED[COLS[colIdx]]} shadow-sm border border-transparent` 
                          : 'bg-white/5 text-gray-400 border border-white/5'
                      } ${isNew ? 'ring-1 ring-white scale-110 z-10' : ''}`}
                    >
                      {num}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </section>

        {/* Center: Current Ball & Recent */}
        <section className="flex-1 flex flex-col gap-2 md:gap-4 min-w-0">
          
          {/* Recent Balls Strip */}
          <div className="glass-panel p-2 md:p-3 rounded-xl border border-white/5 flex items-center justify-center gap-2">
            {recentBalls.length > 0 ? recentBalls.map((b, i) => (
              <div
                key={`${b.number}-${i}`}
                className={`w-10 h-10 md:w-12 md:h-12 rounded-full border-2 flex flex-col items-center justify-center ${
                  i === 0
                    ? `${COL_HEADER[b.letter]} bg-white/10 shadow-[0_0_15px_rgba(255,255,255,0.1)] scale-110`
                    : 'border-white/10 bg-white/5 opacity-60'
                }`}
              >
                <span className={`text-[8px] md:text-[9px] font-bold ${i === 0 ? COL_HEADER[b.letter].split(' ')[0] : 'text-gray-500'}`}>{b.letter}</span>
                <span className={`text-sm md:text-base font-bold ${i === 0 ? 'text-white' : 'text-gray-400'}`}>{b.number}</span>
              </div>
            )) : (
              <span className="text-gray-600 text-xs">Waiting for draw...</span>
            )}
          </div>

          {/* Main Draw Area */}
          <div className="flex-1 glass-panel rounded-xl border border-white/5 flex flex-col items-center justify-center relative p-4">
            
            <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-full border border-white/10">
               <span className="relative flex h-2 w-2 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-yellow-400" />
                </span>
                <span className="text-xs text-white/80">
                  {gameState?.phase === GamePhase.COUNTDOWN ? (
                    <span className="font-bold text-yellow-400 tracking-wider">
                      Starting in {formatTime(countdown ?? 0)}
                    </span>
                  ) : gameState?.phase === GamePhase.DRAWING ? (
                    <span>Live Draw <span className="text-yellow-400 font-bold ml-1">{nextDrawCountdown !== null ? `(Next in ${nextDrawCountdown}s)` : ''}</span></span>
                  ) : 'Waiting...'}
                </span>
            </div>

            <div className="relative w-48 h-48 md:w-64 md:h-64 flex items-center justify-center mb-4">
              <div className={`neon-pulse absolute inset-0 rounded-full border ${newBallFlash ? 'border-purple-400/80 shadow-[0_0_40px_rgba(183,109,255,0.3)]' : 'border-purple-400/20'} transition-all duration-300`} />
              
              <div
                ref={ballRef}
                className="animate-ball-breathe w-40 h-40 md:w-52 md:h-52 rounded-full bg-gradient-to-br from-white via-green-100 to-green-300 shadow-[inset_0_-10px_20px_rgba(0,0,0,0.2),0_0_30px_rgba(74,222,128,0.4)] flex items-center justify-center relative z-10 border-[4px] border-white"
              >
                <div className="text-center select-none pt-2">
                  <div className="text-black font-black text-2xl md:text-3xl leading-none opacity-80">
                    {currentLetter ?? '—'}
                  </div>
                  <div className="text-black font-black text-6xl md:text-7xl leading-none tracking-tight">
                    {currentDraw ?? '?'}
                  </div>
                </div>
              </div>
            </div>

            {/* Claim result */}
            {bingoResult && (
              <div className="absolute bottom-4 bg-black/60 backdrop-blur border border-red-500/30 text-red-400 px-4 py-2 rounded-lg text-sm font-bold flex gap-2 items-center">
                <span>❌</span> {bingoResult.message}
              </div>
            )}
          </div>
        </section>

        {/* Right: My Tickets (Mini Grids) — only shown when user has cards */}
        {hasTickets ? (
        <section className="w-full md:w-[320px] lg:w-[380px] shrink-0 glass-panel border border-white/5 rounded-xl flex flex-col min-h-[250px] md:min-h-0">
          <div className="p-3 border-b border-white/5 flex justify-between items-center bg-black/20">
            <h3 className="text-sm md:text-base font-bold text-white flex gap-2 items-center">
              <span>🎟️</span> የኔ ካርታ (My Ticket)
            </h3>
            <div className="bg-purple-500/20 text-purple-300 text-[10px] px-2 py-1 rounded-md font-bold">
              {myCards.length} Cards
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar p-3">
            {myCards.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-500 text-sm gap-2 opacity-60 p-4 text-center">
                <Loader2 className="w-6 h-6 animate-spin" />
                Loading cards...
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-1 lg:grid-cols-2 gap-3">
                {myCards.map((card) => {
                  const grid = matrixToGrid(card.matrix);
                  const markedCount = card.matrix.filter(v => v !== 0 && drawnNumbers.includes(v)).length;
                  const isNearWin = markedCount >= 20; // Highlight near-winning cards

                  return (
                    <div key={card.cardNumber} className={`bg-white text-black rounded-lg overflow-hidden flex flex-col shadow-lg border-2 ${isNearWin ? 'border-yellow-400 shadow-[0_0_15px_rgba(239,194,0,0.5)]' : 'border-transparent'}`}>
                      <div className="bg-gray-100 px-2 py-1 flex justify-between items-center border-b border-gray-200">
                        <span className="text-[9px] font-bold text-gray-500">#{card.cardNumber}</span>
                        {gameState?.phase === GamePhase.DRAWING && (
                          <button
                            onClick={() => handleClaimBingo(card.cardNumber)}
                            className="bg-purple-600 hover:bg-purple-700 text-white text-[9px] font-bold px-2 py-0.5 rounded shadow-sm transition-all"
                          >
                            BINGO
                          </button>
                        )}
                      </div>
                      <div className="p-1.5 flex-1">
                        <div className="grid grid-cols-5 gap-0.5 mb-1 text-center">
                          {COLS.map((col) => (
                            <div key={col} className={`text-[10px] font-black ${COL_HEADER[col].split(' ')[0]}`}>{col}</div>
                          ))}
                        </div>
                        <div className="grid grid-cols-5 gap-0.5">
                          {COLS.map((col, colIdx) => (
                            <div key={col} className="flex flex-col gap-0.5">
                              {grid.map((row, rowIdx) => {
                                const cell = row[colIdx];
                                const isMarked = !cell.isFree && drawnNumbers.includes(cell.value);
                                const isNew = cell.value === currentDraw;
                                return (
                                  <div
                                    key={rowIdx}
                                    className={`aspect-square flex items-center justify-center text-[10px] font-bold transition-all border ${
                                      cell.isFree
                                        ? 'bg-black text-yellow-400 border-black'
                                        : isMarked
                                        ? 'bg-black text-white border-black'
                                        : 'bg-white text-black border-gray-200'
                                    } ${isNew ? 'ring-1 ring-purple-500 scale-110 z-10' : ''}`}
                                  >
                                    {cell.isFree ? '★' : cell.value}
                                  </div>
                                );
                              })}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
        ) : (
          /* No tickets — compact placeholder so layout doesn't break */
          <section className="w-full md:w-[260px] shrink-0 glass-panel border border-white/5 rounded-xl flex flex-col items-center justify-center gap-3 p-6 text-center min-h-[200px] md:min-h-0">
            {!ticketsReady ? (
              <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
            ) : (
              <>
                <span className="text-4xl">🎟️</span>
                <p className="text-gray-400 text-sm">No cards for this game</p>
                {gameState?.phase === GamePhase.CARD_SELECTION || gameState?.phase === GamePhase.COUNTDOWN ? (
                  <Link href="/pick-card" className="bg-purple-500 hover:bg-purple-600 text-white text-xs font-bold px-4 py-2 rounded-lg transition-all">
                    Buy a Card
                  </Link>
                ) : null}
              </>
            )}
          </section>
        )}
      </main>

      {/* ── Mobile Bottom Bar (Live Prize) ───────────────────────── */}
      <div className="md:hidden glass-panel border-t border-white/5 py-3 px-4 flex justify-between items-center shrink-0 z-40 bg-[#0b080d]/90 backdrop-blur-xl">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full animate-pulse ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <div>
            <div className="text-[10px] text-gray-400">LIVE ውርርድ</div>
            <div className="text-cyan-400 font-bold text-lg leading-tight">{prizeDisplay} ETB</div>
          </div>
        </div>
        <div className="flex gap-4">
           <Link href="/" className="flex flex-col items-center gap-1 text-gray-400 hover:text-white">
            <span className="text-lg">🏠</span>
            <span className="text-[9px]">Home</span>
          </Link>
          <button className="flex flex-col items-center gap-1 text-purple-400">
            <span className="text-lg">🎟️</span>
            <span className="text-[9px]">Ticket</span>
          </button>
          <button className="flex flex-col items-center gap-1 text-gray-400 hover:text-white">
            <span className="text-lg">👤</span>
            <span className="text-[9px]">Profile</span>
          </button>
        </div>
      </div>
    </div>
  );
}
