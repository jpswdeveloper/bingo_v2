'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useActiveGame, useAvailableCards, useCard, useUserProfile, useMyTickets } from '@/lib/use-active-game';
import { useTelegramWebApp } from '@/lib/use-telegram';
import { ticketApi } from '@/lib/api-client';
import { GamePhase } from '@/lib/types';
import { secondsRemaining } from '@/lib/date-utils';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import Link from 'next/link';

// ── Card preview: fetches and shows the 5×5 grid on hover/tap ──
function CardPreview({ cardNumber }: { cardNumber: number }) {
  const { data: card, isLoading } = useCard(cardNumber);
  const COLS = ['B', 'I', 'N', 'G', 'O'];
  const COL_COLOR: Record<string, string> = {
    B: 'text-cyan-400', I: 'text-purple-400',
    N: 'text-pink-400',  G: 'text-yellow-400', O: 'text-orange-400',
  };

  if (isLoading || !card) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
      </div>
    );
  }

  const matrix = card.matrix;
  return (
    <div className="p-3">
      <div className="grid grid-cols-5 gap-1 mb-1">
        {COLS.map((c) => (
          <div key={c} className={`text-center font-black text-sm ${COL_COLOR[c]}`}>{c}</div>
        ))}
      </div>
      <div className="grid grid-cols-5 gap-1">
        {matrix.map((val, i) => (
          <div
            key={i}
            className={`aspect-square rounded text-center text-xs font-bold flex items-center justify-center ${
              val === 0
                ? 'bg-yellow-400/20 text-yellow-400 text-base'
                : 'bg-white/5 text-gray-300'
            }`}
          >
            {val === 0 ? '★' : String(val).padStart(2, '0')}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────
export default function PickCardPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, webApp } = useTelegramWebApp();
  const IS_DEV = process.env.NODE_ENV === 'development';
  const [showDebugPopup, setShowDebugPopup] = useState(false);

  const { data: gameState, isLoading: gameLoading } = useActiveGame();
  const { data: availData, isLoading: availLoading, refetch: refetchAvail } = useAvailableCards(true);
  const { data: userProfile, isLoading: profileLoading } = useUserProfile(user?.telegramId ?? null);
  const { data: myTickets = [], isLoading: myTicketsLoading } = useMyTickets(user?.telegramId ?? null);

  const [selected, setSelected] = useState<number[]>([]);
  const [previewCard, setPreviewCard] = useState<number | null>(null);
  const [buying, setBuying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [search, setSearch] = useState('');

  // Redirect when the game phase moves past what pick-card handles
  useEffect(() => {
    if (gameLoading || myTicketsLoading) return;

    if (!gameState) return; // handled by the loading/no-game render below

    console.log('[PickCard] redirect guard check:', {
      phase: gameState.phase,
      myTickets: myTickets.length,
      gameId: gameState.gameId,
    });

    if (gameState.phase === GamePhase.DRAWING) {
      // Game started — only route if user has tickets, otherwise stay put
      // and let them see the "purchase closed" message
      if (myTickets.length > 0) {
        console.log('[PickCard] DRAWING + has tickets → /game');
        router.replace(`/game/${gameState.gameId}`);
      } else {
        console.log('[PickCard] DRAWING + no tickets → stay on pick-card (show "too late")');
      }
    } else if (gameState.phase === GamePhase.GAME_OVER) {
      console.log('[PickCard] GAME_OVER → /');
      router.replace('/');
    }
  }, [gameState?.phase, gameState?.gameId, gameLoading, myTicketsLoading, myTickets?.length, router]);

  // Sold card set for O(1) lookup
  const soldSet = useMemo(
    () => new Set(availData?.sold ?? gameState?.soldCardNumbers ?? []),
    [availData, gameState],
  );

  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  useEffect(() => {
    if (
      (gameState?.phase === GamePhase.COUNTDOWN || gameState?.phase === GamePhase.CARD_SELECTION) &&
      gameState.countdownStartedAt
    ) {
      const interval = setInterval(() => {
        const remaining = secondsRemaining(gameState.countdownStartedAt!, gameState.countdownSeconds);
        setTimeLeft(remaining);

        // When countdown hits zero and user bought cards, go to game room.
        // The DRAWING phase transition may not have polled yet — route proactively.
        if (remaining === 0 && myTickets.length > 0 && gameState.gameId) {
          clearInterval(interval);
          router.replace(`/game/${gameState.gameId}`);
        }
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setTimeLeft(null);
    }
  }, [gameState?.phase, gameState?.countdownStartedAt, gameState?.countdownSeconds, gameState?.gameId, myTickets.length, router]);

  // All 600 cards filtered by search
  const allCards = useMemo(() => {
    const nums: number[] = [];
    for (let i = 1; i <= 600; i++) nums.push(i);
    if (!search) return nums;
    const q = parseInt(search, 10);
    if (isNaN(q)) return nums;
    return nums.filter((n) => String(n).includes(search));
  }, [search]);

  const totalCost = selected.length * (gameState?.ticketPrice ?? 0);
  const canAfford = userProfile
    ? userProfile.walletBalance >= totalCost
    : false;

  const handleSelect = (cardNum: number) => {
    if (soldSet.has(cardNum)) return;
    setSelected((prev) =>
      prev.includes(cardNum)
        ? prev.filter((n) => n !== cardNum)
        : [...prev, cardNum]
    );
    setError(null);
    webApp?.HapticFeedback?.selectionChanged();
  };

  const buyLock = useRef(false);

  const handleBuy = async () => {
    if (selected.length === 0 || !user?.telegramId || !gameState) return;
    if (buyLock.current) return; // Prevent double-clicks
    // Block purchases if window has closed
    if (gameState.phase === GamePhase.COUNTDOWN) {
      setError('Purchase window has closed. The game is about to start.');
      return;
    }

    if (!canAfford) {
      setError(`Insufficient balance. Need ${totalCost} ETB for ${selected.length} cards.`);
      webApp?.HapticFeedback?.notificationOccurred('error');
      return;
    }

    buyLock.current = true;
    setBuying(true);
    setError(null);

    try {
      await ticketApi.buyTicketBatch(user.telegramId, selected);

      // Force-refetch so tickets are fresh immediately
      await queryClient.refetchQueries({ queryKey: ['tickets', 'mine'] });
      await queryClient.invalidateQueries({ queryKey: ['user', 'profile'] });
      await queryClient.invalidateQueries({ queryKey: ['tickets', 'available'] });

      webApp?.HapticFeedback?.notificationOccurred('success');
      setSuccess(true);
      setSelected([]);
      // Do NOT navigate yet — stay on this page and show the countdown.
      // The redirect guard below will route to /game once phase becomes DRAWING.
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ?? err?.message ?? 'Failed to buy card.';
      setError(msg);
      webApp?.HapticFeedback?.notificationOccurred('error');
    } finally {
      setBuying(false);
      buyLock.current = false;
    }
  };

  // ── Loading state ─────────────────────────────────────────────
  if (gameLoading || availLoading || profileLoading) {
    return (
      <div className="min-h-screen bg-[#0b080d] flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 text-purple-400 animate-spin" />
        <p className="text-gray-400 text-sm">Loading game...</p>
      </div>
    );
  }

  if (!gameState) {
    return (
      <div className="min-h-screen bg-[#0b080d] flex flex-col items-center justify-center gap-4 px-6 text-center">
        <span className="text-5xl">🎲</span>
        <p className="text-white font-bold text-lg">No active game right now.</p>
        <p className="text-gray-400 text-sm">Check back soon — a new game starts shortly.</p>
        <Link href="/" className="text-purple-400 underline text-sm">Back to Lobby</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b080d] flex flex-col text-white pb-32">

      {/* ── Header ───────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 bg-[#0b080d]/95 backdrop-blur-sm border-b border-white/5 px-4 py-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-gray-400 hover:text-white">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="font-black text-lg leading-none">Pick Your Card</h1>
              <p className="text-gray-500 text-xs mt-0.5">{gameState.gameCode} · {gameState.ticketPrice} ETB</p>
            </div>
          </div>
          {/* Balance + debug trigger */}
          <div className="flex items-center gap-2">
            {IS_DEV && (
              <button
                onClick={() => setShowDebugPopup(true)}
                className="bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 text-[10px] font-bold px-2 py-1.5 rounded-lg"
              >
                🐛
              </button>
            )}
            <div className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-right">
              <div className="text-[10px] text-gray-500 uppercase tracking-wider">Balance</div>
              <div className={`font-bold text-sm ${canAfford ? 'text-cyan-400' : 'text-red-400'}`}>
                {userProfile ? `${userProfile.walletBalance.toFixed(2)} ETB` : '—'}
              </div>
            </div>
          </div>
        </div>

        {/* Stats bar */}
        <div className="flex gap-3 text-xs">
          <div className="flex-1 bg-white/5 rounded-lg px-3 py-2 text-center">
            <div className="text-gray-500">Sold</div>
            <div className="text-white font-bold">{soldSet.size}</div>
          </div>
          <div className="flex-1 bg-white/5 rounded-lg px-3 py-2 text-center">
            <div className="text-gray-500">Available</div>
            <div className="text-green-400 font-bold">{600 - soldSet.size}</div>
          </div>
          <div className="flex-1 bg-white/5 rounded-lg px-3 py-2 text-center">
            <div className="text-gray-500">Price</div>
            <div className="text-purple-400 font-bold">{gameState.ticketPrice} ETB</div>
          </div>
        </div>

        {/* Countdown Banner */}
        {(gameState.phase === GamePhase.COUNTDOWN || gameState.phase === GamePhase.CARD_SELECTION) && timeLeft !== null && (
          <div className={`mt-3 rounded-xl p-3 text-center shadow-[0_0_15px_rgba(168,85,247,0.2)] border ${
            timeLeft <= 10
              ? 'bg-red-500/20 border-red-500/40 text-red-200 animate-pulse'
              : gameState.phase === GamePhase.COUNTDOWN
              ? 'bg-yellow-500/20 border-yellow-500/30 text-yellow-200'
              : 'bg-purple-500/20 border-purple-500/30 text-purple-200'
          }`}>
            <p className="text-sm font-semibold">
              {gameState.phase === GamePhase.COUNTDOWN
                ? '⚡ Purchase window closed — game starting in'
                : timeLeft <= 10
                ? '🔥 Hurry! Purchasing closes in'
                : 'Purchasing ends in'}
              <span className="font-black text-xl text-white ml-2">{timeLeft}s</span>
            </p>
            {gameState.phase === GamePhase.CARD_SELECTION && (
              <p className="text-[10px] mt-1 opacity-70 uppercase tracking-widest">
                {timeLeft <= 10 ? 'Last chance to buy!' : 'Buy your cards quickly!'}
              </p>
            )}
            {gameState.phase === GamePhase.COUNTDOWN && (
              <p className="text-[10px] mt-1 opacity-70 uppercase tracking-widest">
                Redirecting to game room...
              </p>
            )}
          </div>
        )}

        {/* Search */}
        <input
          type="number"
          placeholder="Search card number (1–600)..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mt-3 w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50"
          min={1}
          max={600}
        />
      </header>

      {/* ── Insufficient balance warning ─────────────────────── */}
      {userProfile && !canAfford && (
        <div className="mx-4 mt-4 flex items-start gap-3 bg-red-500/10 border border-red-500/20 rounded-xl p-4">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-red-400 font-semibold text-sm">Insufficient Balance</p>
            <p className="text-red-300/70 text-xs mt-0.5">
              You need {gameState.ticketPrice} ETB to buy a card. Your balance: {userProfile.walletBalance.toFixed(2)} ETB.
              Deposit via the Telegram bot.
            </p>
          </div>
        </div>
      )}

      {/* ── Success state ─────────────────────────────────────── */}
      {success && (
        <div className="mx-4 mt-4 flex items-center gap-3 bg-green-500/10 border border-green-500/20 rounded-xl p-4">
          <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" />
          <div>
            <p className="text-green-400 font-semibold text-sm">Cards purchased! Waiting for game to start...</p>
            <p className="text-green-300/70 text-xs">
              {timeLeft !== null && timeLeft > 0
                ? `Game starts in ${timeLeft}s`
                : 'Starting now...'}
            </p>
          </div>
        </div>
      )}

      {/* ── Error ────────────────────────────────────────────── */}
      {error && (
        <div className="mx-4 mt-4 flex items-start gap-3 bg-red-500/10 border border-red-500/20 rounded-xl p-4">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* ── Purchase window closed (game started, user didn't buy) ─── */}
      {gameState?.phase === GamePhase.DRAWING && myTickets.length === 0 && (
        <div className="mx-4 mt-4 flex items-start gap-3 bg-orange-500/10 border border-orange-500/20 rounded-xl p-4">
          <AlertCircle className="w-5 h-5 text-orange-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-orange-400 font-semibold text-sm">Purchase Window Closed</p>
            <p className="text-orange-300/70 text-xs mt-0.5">
              The game has started. You didn't purchase a card in time. Wait for the next game.
            </p>
          </div>
        </div>
      )}

      {/* ── Card Grid ────────────────────────────────────────── */}
      <div className="flex-1 px-4 pt-4">
        {gameState.phase === GamePhase.COUNTDOWN ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
            <div className="text-5xl animate-pulse">⏳</div>
            <p className="text-white font-bold text-lg">Purchase window closed</p>
            <p className="text-gray-400 text-sm">The game is about to start. Cards can no longer be purchased.</p>
          </div>
        ) : (
        <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-2">
          {allCards.map((num) => {
            const sold = soldSet.has(num);
            const isSelected = selected.includes(num);
            const isPreviewing = previewCard === num;

            return (
              <button
                key={num}
                disabled={sold || buying || success || gameState.phase === GamePhase.COUNTDOWN}
                onClick={() => handleSelect(num)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setPreviewCard(isPreviewing ? null : num);
                }}
                className={`
                  aspect-square rounded-xl text-sm font-bold flex items-center justify-center
                  relative transition-all duration-150 select-none
                  ${sold
                    ? 'bg-gray-800/30 text-gray-700 cursor-not-allowed line-through'
                    : isSelected
                    ? 'bg-purple-500 text-white shadow-[0_0_20px_rgba(183,109,255,0.5)] scale-110 ring-2 ring-purple-400 ring-offset-1 ring-offset-[#0b080d]'
                    : 'bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 hover:border-purple-500/30 active:scale-95'
                  }
                `}
              >
                {num}
              </button>
            );
          })}
        </div>
        )} {/* end phase !== COUNTDOWN */}
      </div>

      {/* ── Card Preview Modal ───────────────────────────────── */}
      {previewCard && !soldSet.has(previewCard) && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6"
          onClick={() => setPreviewCard(null)}
        >
          <div
            className="glass-panel rounded-2xl w-full max-w-xs border border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 pt-4 pb-2 border-b border-white/5">
              <div>
                <span className="font-black text-white">Card #{previewCard}</span>
                {soldSet.has(previewCard) && (
                  <span className="ml-2 text-xs text-red-400 font-bold">SOLD</span>
                )}
              </div>
              <button
                onClick={() => setPreviewCard(null)}
                className="text-gray-500 hover:text-white text-xl leading-none"
              >×</button>
            </div>
            <CardPreview cardNumber={previewCard} />
            {!soldSet.has(previewCard) && (
              <div className="px-3 pb-4">
                <button
                  onClick={() => {
                    setSelected((prev) => 
                      prev.includes(previewCard) ? prev.filter(n => n !== previewCard) : [...prev, previewCard]
                    );
                    setPreviewCard(null);
                  }}
                  className="w-full py-2.5 rounded-xl bg-purple-500 hover:bg-purple-600 text-white font-bold text-sm transition-all"
                >
                  {selected.includes(previewCard) ? `Deselect Card #${previewCard}` : `Select Card #${previewCard}`}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Sticky bottom bar ────────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 z-30 p-4 bg-gradient-to-t from-[#0b080d] via-[#0b080d]/95 to-transparent">        {selected.length > 0 ? (
          <div className="glass-panel border border-white/10 rounded-2xl p-4 flex items-center gap-4">
            <div className="flex-1">
              <p className="text-white font-bold">{selected.length} card(s) selected</p>
              <p className="text-gray-400 text-xs mt-0.5">
                Total: <span className="text-purple-300 font-semibold">{totalCost.toFixed(2)} ETB</span>
                {userProfile && (
                  <span className="text-gray-500">
                    {' '}· After: {(userProfile.walletBalance - totalCost).toFixed(2)} ETB
                  </span>
                )}
              </p>
            </div>
            <button
              onClick={handleBuy}
              disabled={buying || !canAfford || success || gameState.phase === GamePhase.COUNTDOWN}
              className={`px-6 py-3 rounded-xl font-black text-sm transition-all ${
                canAfford && !buying && !success && gameState.phase !== GamePhase.COUNTDOWN
                  ? 'bg-purple-500 hover:bg-purple-600 text-white shadow-[0_0_20px_rgba(183,109,255,0.4)] active:scale-95'
                  : 'bg-gray-700 text-gray-500 cursor-not-allowed'
              }`}
            >
              {buying ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : success ? (
                '✓ Done'
              ) : gameState.phase === GamePhase.COUNTDOWN ? (
                'Window Closed'
              ) : (
                'BUY'
              )}
            </button>
          </div>
        ) : (
          <div className="text-center text-gray-600 text-sm py-3">
            Tap a card to select · Long-press to preview
          </div>
        )}
      </div>

      {/* ── Debug popup ──────────────────────────────────────── */}
      {showDebugPopup && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-6"
          onClick={() => setShowDebugPopup(false)}
        >
          <div
            className="bg-[#1a1a2e] border border-yellow-500/30 rounded-2xl w-full max-w-sm p-6 font-mono text-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-yellow-400 font-bold">🐛 Debug Info</span>
              <button onClick={() => setShowDebugPopup(false)} className="text-gray-500 hover:text-white text-xl leading-none">×</button>
            </div>
            <div className="space-y-2 text-xs">
              <Row label="telegramId" value={user?.telegramId ?? 'null ⚠️'} color={user?.telegramId ? 'text-cyan-400' : 'text-red-400'} />
              <Row label="firstName"  value={user?.firstName ?? '—'} />
              <Row label="gameId"     value={gameState?.gameId?.slice(-8) ?? '—'} />
              <Row label="phase"      value={gameState?.phase ?? '—'} color="text-purple-400" />
              <Row label="tickets"    value={myTickets.length > 0 ? myTickets.map(t => `#${t.cardNumber}`).join(', ') : 'none ⚠️'} color={myTickets.length > 0 ? 'text-green-400' : 'text-red-400'} />
              <Row label="balance"    value={userProfile ? `${userProfile.walletBalance.toFixed(2)} ETB` : '—'} color="text-cyan-400" />
              <Row label="timeLeft"   value={timeLeft !== null ? `${timeLeft}s` : '—'} color="text-yellow-400" />
              <Row label="soldCount"  value={String(gameState?.soldCount ?? '—')} />
            </div>
            <button
              onClick={() => setShowDebugPopup(false)}
              className="mt-5 w-full bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 font-bold py-2 rounded-lg transition-all"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, color = 'text-white' }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-gray-400 shrink-0">{label}</span>
      <span className={`${color} text-right break-all`}>{value}</span>
    </div>
  );
}
