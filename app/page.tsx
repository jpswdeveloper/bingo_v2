"use client";

import { useState, useEffect, useRef } from "react";
import { Zap, Shield, Grid3x3, List, Menu, X, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActiveGame, useMyTicket, useUserProfile } from "@/lib/use-active-game";
import { useTelegramWebApp } from "@/lib/use-telegram";
import { gameApi } from "@/lib/api-client";
import { GamePhase } from "@/lib/types";

const LOBBIES = [
  { id: "play-10",    stakeEtb: 10, name: "Play 10",    stake: "10 ETB",  icon: "🎲", badge: undefined,        buttonBase: "bg-cyan-400 hover:bg-cyan-500",     textColor: "text-cyan-400",   iconBg: "bg-cyan-500/20",   glow: "hover:border-cyan-500/40" },
  { id: "play-20",    stakeEtb: 20, name: "Play 20",    stake: "20 ETB",  icon: "🎲", badge: "MOST POPULAR",   buttonBase: "bg-purple-400 hover:bg-purple-500", textColor: "text-purple-400", iconBg: "bg-purple-500/20", glow: "hover:border-purple-500/40" },
  { id: "high-roller",stakeEtb: 50, name: "High Roller", stake: "50 ETB", icon: "🏆", badge: undefined,        buttonBase: "bg-yellow-500 hover:bg-yellow-600", textColor: "text-yellow-500", iconBg: "bg-yellow-500/20", glow: "hover:border-yellow-500/40" },
];

export default function Home() {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [joiningStake, setJoiningStake] = useState<number | null>(null);
  const joinLock = useRef(false); // ref-based lock survives strict-mode double-invoke
  const isNavigating = useRef(false); // prevent auto-redirect while handleJoin is routing

  const { user, isReady: telegramReady } = useTelegramWebApp();
  const { data: gameState, isLoading: gameLoading } = useActiveGame();
  const { data: myTicket, isLoading: myTicketLoading } = useMyTicket(user?.telegramId ?? null);
  const { data: userProfile } = useUserProfile(user?.telegramId ?? null);

  // Auto-redirect logic:
  // - CARD_SELECTION + has ticket → /game (already bought, go watch)
  // - CARD_SELECTION + no ticket (or still loading) → stay on lobby (buy a card)
  // - COUNTDOWN → /game only if user has a ticket; otherwise stay (too late but can't buy)
  // - DRAWING → /game only if user has a ticket; otherwise stay on lobby
  // - GAME_OVER → stay on lobby (no redirect needed, game ended)
  useEffect(() => {
    if (!telegramReady || gameLoading || !gameState) return;
    if (isNavigating.current) return;

    const cardParam = myTicket ? `?card=${myTicket.cardNumber}` : "";

    if (gameState.phase === GamePhase.COUNTDOWN || gameState.phase === GamePhase.DRAWING) {
      // Only redirect if ticket query is resolved AND user has a ticket
      if (!myTicketLoading && myTicket) {
        isNavigating.current = true;
        router.replace(`/game/${gameState.gameId}${cardParam}`);
      }
      // No ticket during COUNTDOWN/DRAWING → stay on lobby, let them see the state
      return;
    }

    if (
      gameState.phase === GamePhase.CARD_SELECTION &&
      !myTicketLoading &&
      myTicket
    ) {
      isNavigating.current = true;
      router.replace(`/game/${gameState.gameId}${cardParam}`);
    }
  }, [telegramReady, gameLoading, myTicketLoading, gameState?.phase, gameState?.gameId, myTicket?.cardNumber, router]);

  // Mouse glow
  useEffect(() => {
    const fn = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth) * 100;
      const y = (e.clientY / window.innerHeight) * 100;
      document.body.style.backgroundImage = `radial-gradient(circle at ${x}% ${y}%, #1e1528 0%, #16111b 100%)`;
    };
    window.addEventListener("mousemove", fn);
    return () => window.removeEventListener("mousemove", fn);
  }, []);

  const handleJoin = async (stakeEtb: number) => {
    if (joinLock.current || joiningStake) return;
    joinLock.current = true;

    // If there's an active game in a non-selectable phase, route directly
    if (gameState && gameState.phase !== GamePhase.CARD_SELECTION) {
      console.log('[Home] Active game already in phase:', gameState.phase, '— routing directly');
      joinLock.current = false;
      if (gameState.phase === GamePhase.GAME_OVER) return;
      const cardParam = myTicket ? `?card=${myTicket.cardNumber}` : "";
      isNavigating.current = true;
      router.push(`/game/${gameState.gameId}${cardParam}`);
      return;
    }

    setJoiningStake(stakeEtb);
    try {
      const result = await gameApi.joinOrCreate(stakeEtb);
      console.log('[Home] joinOrCreate result:', result);
      const cardParam = myTicket ? `?card=${myTicket.cardNumber}` : "";
      isNavigating.current = true; // block auto-redirect from competing
      if (result.phase === GamePhase.CARD_SELECTION) {
        router.push("/pick-card");
      } else if (result.phase === GamePhase.COUNTDOWN || result.phase === GamePhase.DRAWING) {
        router.push(`/game/${result.gameId}${cardParam}`);
      } else {
        isNavigating.current = false; // GAME_OVER — not navigating
        console.warn('[Home] joinOrCreate returned GAME_OVER phase, ignoring');
      }
    } catch (err: any) {
      isNavigating.current = false;
      console.error('[Home] joinOrCreate error:', err);
      alert(err?.response?.data?.message ?? "Failed to join lobby");
    } finally {
      setJoiningStake(null);
      joinLock.current = false;
    }
  };

  const activeCount = (gameState?.soldCount ?? 0) + 45_000;
  const initials = user ? user.firstName.slice(0, 2).toUpperCase() : "?";
  const displayName = user ? `${user.firstName}${user.lastName ? " " + user.lastName : ""}` : "Guest";

  return (
    <div className="min-h-screen bg-[#0a0a0f] pb-20 md:pb-0">

      {/* ── Header ─────────────────────────────────────────── */}
      <header className="border-b border-gray-800 bg-[#0a0a0f]/95 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 md:py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button className="md:hidden text-white p-2" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-cyan-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">🎲</span>
            </div>
            <span className="text-lg md:text-xl font-bold text-white">Melkam Bingo</span>
          </div>

          <nav className="hidden md:flex items-center gap-1">
            {["🏠 Lobby","🕒 History","💳 Wallet","🏆 Leaderboard"].map(l => (
              <button key={l} className="px-4 py-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors">{l}</button>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-4">
            <div className="bg-gray-800/50 rounded-full px-4 py-2 flex items-center gap-2">
              <span className="text-xs text-gray-400">BALANCE</span>
              <span className="text-lg font-bold text-cyan-400">
                {userProfile ? `${userProfile.walletBalance.toFixed(2)} ETB` : "—"}
              </span>
            </div>
            <div className="flex items-center gap-2 bg-gray-800/50 rounded-full px-3 py-2">
              <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-bold">{initials}</span>
              </div>
              <span className="text-white text-sm">{displayName}</span>
            </div>
          </div>

          <div className="md:hidden flex items-center gap-2">
            <span className="text-xs text-cyan-400 font-bold">
              {userProfile ? `${userProfile.walletBalance.toFixed(0)} ETB` : ""}
            </span>
            <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-bold">{initials}</span>
            </div>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-800 bg-[#0f0f14] absolute w-full z-50">
            <nav className="flex flex-col p-4 gap-2">
              {["🏠 Lobby","🕒 History","💳 Wallet","🏆 Leaderboard"].map(l => (
                <button key={l} className="px-4 py-3 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg text-left">{l}</button>
              ))}
            </nav>
          </div>
        )}
      </header>

      <main className="container mx-auto px-4 py-6 md:py-12">

        {/* Live badge */}
        <div className="mb-6 md:mb-8">
          <span className="inline-flex items-center gap-2 bg-purple-500/20 text-purple-400 px-3 md:px-4 py-2 rounded-full text-xs md:text-sm">
            <span className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
            {gameState ? `LIVE · ${gameState.gameCode} · ${gameState.phase.replace("_", " ")}` : "LIVE PLATFORM ACTIVITY"}
          </span>
        </div>

        {/* Mobile active counter */}
        <div className="md:hidden mb-8 flex justify-center">
          <div className="relative w-52 h-52 flex items-center justify-center">
            <div className="ring-spin absolute inset-0 rounded-full border-2 border-dashed border-yellow-500/20" />
            <div className="absolute inset-3 rounded-full border border-purple-500/10" />
            <div className="ring-spin-reverse absolute inset-6 rounded-full border border-cyan-500/10" />
            <div className="absolute inset-10 rounded-full bg-white/5 border border-white/10 flex flex-col items-center justify-center">
              <div className="text-2xl font-bold text-purple-300">{activeCount.toLocaleString()}</div>
              <div className="text-[10px] text-gray-400 uppercase tracking-widest mt-1">Active</div>
            </div>
          </div>
        </div>

        {/* Desktop hero */}
        <div className="hidden md:grid lg:grid-cols-2 gap-12 mb-16">
          <div>
            <h1 className="text-5xl font-bold text-white mb-4 leading-tight">
              Premium Bingo<br />
              <span className="bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
                Social Experience
              </span>
            </h1>
            <p className="text-gray-400 text-lg mb-8">
              Join thousands of players in real-time lobbies. Fair play, instant payouts, best community in gaming.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-800/30 border border-gray-800 rounded-xl p-4 flex items-center gap-3">
                <div className="w-12 h-12 bg-yellow-500/20 rounded-lg flex items-center justify-center shrink-0">
                  <Shield className="w-6 h-6 text-yellow-500" />
                </div>
                <div>
                  <div className="text-xs text-gray-500 uppercase">Security</div>
                  <div className="text-white font-semibold">RNG Certified</div>
                </div>
              </div>
              <div className="bg-gray-800/30 border border-gray-800 rounded-xl p-4 flex items-center gap-3">
                <div className="w-12 h-12 bg-cyan-500/20 rounded-lg flex items-center justify-center shrink-0">
                  <Zap className="w-6 h-6 text-cyan-500" />
                </div>
                <div>
                  <div className="text-xs text-gray-500 uppercase">Payments</div>
                  <div className="text-white font-semibold">Instant Payout</div>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-center">
            <div className="relative w-80 h-80 flex items-center justify-center">
              <div className="ring-spin absolute inset-0 rounded-full border-2 border-dashed border-yellow-500/20" />
              <div className="absolute inset-4 rounded-full border border-purple-500/10" />
              <div className="ring-spin-reverse absolute inset-8 rounded-full border border-cyan-500/10" />
              <div className="absolute inset-12 rounded-full bg-white/5 border border-white/10 flex flex-col items-center justify-center">
                <div className="text-4xl font-bold text-purple-300">{activeCount.toLocaleString()}</div>
                <div className="text-xs text-gray-400 uppercase tracking-[0.2em] mt-1">Active Now</div>
              </div>
            </div>
          </div>
        </div>

        {/* Live ticker */}
        <div className="hidden sm:flex mb-8 md:mb-12 bg-white/5 border border-white/10 rounded-2xl h-12 md:h-14 overflow-hidden items-center">
          <div className="bg-gray-800/80 px-4 md:px-6 h-full flex items-center border-r border-white/10 shrink-0">
            <span className="text-purple-400 font-bold uppercase tracking-widest text-xs whitespace-nowrap">Live Feed</span>
          </div>
          <div className="overflow-hidden flex-1">
            <div className="animate-ticker whitespace-nowrap flex gap-12 px-8">
              {gameState ? (
                <>
                  <span className="text-cyan-400 font-mono text-sm">🎮 {gameState.gameCode} · {gameState.phase.replace("_", " ")}</span>
                  <span className="text-yellow-400 font-mono text-sm">🎟️ {gameState.soldCount} cards sold · {gameState.availableCount} remaining</span>
                  <span className="text-purple-400 font-mono text-sm">🎱 {gameState.drawCount} drawn · {gameState.remaining} remaining</span>
                  <span className="text-cyan-400 font-mono text-sm">💰 {gameState.ticketPrice} ETB per card</span>
                </>
              ) : (
                <>
                  <span className="text-cyan-400 font-mono text-sm">👤 @Abebe joined Stake 20</span>
                  <span className="text-yellow-400 font-mono text-sm">🏆 @Selam won 1,500 ETB</span>
                  <span className="text-cyan-400 font-mono text-sm">👤 @Desta joined Stake 10</span>
                  <span className="text-yellow-400 font-mono text-sm">⭐ @Yosef won 500 ETB</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Stake section header */}
        <div className="flex items-center justify-between mb-4 md:mb-6">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-white mb-1">Select Your Stake</h2>
            <p className="text-sm md:text-base text-gray-400">Choose a lobby that fits your playstyle and bankroll.</p>
          </div>
          <div className="hidden md:flex items-center gap-2 bg-gray-800/50 rounded-lg p-1">
            <button onClick={() => setViewMode("grid")} className={`p-2 rounded ${viewMode === "grid" ? "bg-gray-700 text-white" : "text-gray-400"}`}>
              <Grid3x3 className="w-5 h-5" />
            </button>
            <button onClick={() => setViewMode("list")} className={`p-2 rounded ${viewMode === "list" ? "bg-gray-700 text-white" : "text-gray-400"}`}>
              <List className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Lobby cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {LOBBIES.map((lobby) => {
            const isActive = gameState && gameState.ticketPrice === lobby.stakeEtb;
            // A different-stake active game blocks this lobby entirely
            const otherGameActive = gameState && !isActive && gameState.phase !== GamePhase.GAME_OVER;
            const isLoading = joiningStake === lobby.stakeEtb;

            const soldCount = isActive ? (gameState!.soldCount ?? 0) : 0;
            const fillPct  = isActive ? Math.min(Math.round((soldCount / 600) * 100), 100) : 0;

            // Derive button label and disabled state
            let btnLabel = "JOIN LOBBY";
            let btnDisabled = !!joiningStake || !!otherGameActive;
            if (isActive) {
              switch (gameState!.phase) {
                case GamePhase.CARD_SELECTION: btnLabel = "SELECT CARD"; break;
                case GamePhase.COUNTDOWN:      btnLabel = "STARTING SOON"; break;
                case GamePhase.DRAWING:        btnLabel = "WATCH LIVE"; break;
                case GamePhase.GAME_OVER:      btnLabel = "GAME OVER"; btnDisabled = true; break;
              }
            } else if (otherGameActive) {
              btnLabel = "GAME IN PROGRESS";
              btnDisabled = true;
            }

            return (
              <div
                key={lobby.id}
                className={`bg-gray-800/30 border rounded-2xl p-5 md:p-6 relative overflow-hidden group transition-all ${
                  otherGameActive ? 'opacity-40 cursor-not-allowed' : 'hover:-translate-y-2 cursor-pointer'
                } ${
                  isActive ? "border-purple-500/40 shadow-[0_0_20px_rgba(183,109,255,0.1)]" : `border-gray-800 ${!otherGameActive ? lobby.glow : ''}`
                }`}
              >
                {isActive && gameState!.phase !== GamePhase.GAME_OVER && (
                  <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-green-500/20 text-green-400 text-[10px] px-2 py-1 rounded-full font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" /> LIVE
                  </div>
                )}
                {isActive && gameState!.phase === GamePhase.COUNTDOWN && (
                  <div className="absolute top-3 right-3 bg-yellow-500/20 text-yellow-400 text-[10px] px-2 py-1 rounded-full font-bold border border-yellow-500/30 animate-pulse">
                    ⏳ STARTING
                  </div>
                )}
                {lobby.badge && !isActive && !otherGameActive && (
                  <div className="absolute top-3 right-3 bg-purple-500 text-white text-[10px] px-2 py-1 rounded-full font-bold">
                    {lobby.badge}
                  </div>
                )}

                <div className="flex items-start gap-3 mb-4 mt-4">
                  <div className={`w-12 h-12 md:w-14 md:h-14 ${lobby.iconBg} rounded-xl flex items-center justify-center text-2xl shrink-0`}>
                    {lobby.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white">{lobby.name}</h3>
                    <div className={`text-xl font-bold ${lobby.textColor}`}>{lobby.stake}</div>
                  </div>
                </div>

                <div className="space-y-2 mb-5">
                  {isActive ? (
                    <>
                      <div className="flex items-center justify-between text-sm text-gray-400">
                        <span>🎟️ {soldCount} sold</span>
                        <span>✅ {600 - soldCount} available</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
                        <div className={`h-full transition-all duration-500 ${lobby.buttonBase.split(" ")[0]}`} style={{ width: `${fillPct}%` }} />
                      </div>
                      <div className="text-xs text-gray-500 text-right">{fillPct}% FULL</div>
                    </>
                  ) : otherGameActive ? (
                    <div className="text-sm text-gray-600 flex items-center gap-2">
                      <span>🔒</span> Another game is running
                    </div>
                  ) : (
                    <div className="text-sm text-gray-600 flex items-center gap-2">
                      <span>⏳</span> No active game at this stake
                    </div>
                  )}
                </div>

                <button
                  onClick={() => !btnDisabled && handleJoin(lobby.stakeEtb)}
                  disabled={btnDisabled}
                  className={`w-full font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 ${lobby.buttonBase} text-white disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {isLoading ? "Joining..." : btnLabel}
                </button>
              </div>
            );
          })}
        </div>

        {/* Mobile feature badges */}
        <div className="md:hidden grid grid-cols-2 gap-3 mt-8">
          <div className="bg-gray-800/30 border border-gray-800 rounded-xl p-3 flex items-center gap-2">
            <div className="w-10 h-10 bg-yellow-500/20 rounded-lg flex items-center justify-center shrink-0">
              <Shield className="w-5 h-5 text-yellow-500" />
            </div>
            <div>
              <div className="text-[10px] text-gray-500 uppercase">Security</div>
              <div className="text-sm text-white font-semibold">RNG Certified</div>
            </div>
          </div>
          <div className="bg-gray-800/30 border border-gray-800 rounded-xl p-3 flex items-center gap-2">
            <div className="w-10 h-10 bg-cyan-500/20 rounded-lg flex items-center justify-center shrink-0">
              <Zap className="w-5 h-5 text-cyan-500" />
            </div>
            <div>
              <div className="text-[10px] text-gray-500 uppercase">Payments</div>
              <div className="text-sm text-white font-semibold">Instant Payout</div>
            </div>
          </div>
        </div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#0f0f14] border-t border-gray-800 px-4 py-3 flex justify-around items-center z-40">
        <button className="flex flex-col items-center gap-1 text-purple-400">
          <span className="text-2xl">🎯</span><span className="text-xs font-medium">Lobby</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-gray-500">
          <span className="text-2xl">🕒</span><span className="text-xs">History</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-gray-500">
          <span className="text-2xl">💳</span><span className="text-xs">Wallet</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-gray-500">
          <span className="text-2xl">👤</span><span className="text-xs">Profile</span>
        </button>
      </nav>

      {/* Desktop footer */}
      <footer className="hidden md:block border-t border-gray-800 mt-20 py-8">
        <div className="container mx-auto px-4 flex items-center justify-between text-sm text-gray-500">
          <div>© 2026 MELKAM BINGO</div>
          <div className="flex items-center gap-6">
            <a href="#" className="hover:text-white">Terms of Service</a>
            <a href="#" className="hover:text-white">Privacy Policy</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
