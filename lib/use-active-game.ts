import { useQuery, useQueries } from '@tanstack/react-query';
import { gameApi, ticketApi, userApi } from './api-client';
import type { GameState, Ticket, BingoCard, UserProfile } from './types';
import { GamePhase } from './types';

// ─────────────────────────────────────────────────────────────
// User's tickets in active game (array — multiple cards)
// ─────────────────────────────────────────────────────────────
export function useMyTickets(telegramId: string | null) {
  return useQuery<Ticket[]>({
    queryKey: ['tickets', 'mine', telegramId],
    queryFn: async () => {
      if (!telegramId) return [];
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/tickets/mine?telegramId=${telegramId}`,
        {
          headers: {
            'ngrok-skip-browser-warning': '1',
          },
          // no-store tells the browser to always hit the network, never use cached response
          cache: 'no-store',
        },
      );
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!telegramId,
    staleTime: 0,        // always treat as stale → refetch immediately on mount
    gcTime: 0,           // don't cache results in memory after component unmounts
    refetchInterval: 4_000,
  });
}

// ─────────────────────────────────────────────────────────────
// Active Game — polls REST every 3s as a baseline.
// The game page overlays real-time WebSocket updates on top.
// ─────────────────────────────────────────────────────────────
export function useActiveGame() {
  return useQuery<GameState | null>({
    queryKey: ['game', 'active'],
    queryFn: () => gameApi.getActiveGame(),
    refetchInterval: 3_000,
    staleTime: 2_000,
  });
}

// ─────────────────────────────────────────────────────────────
// Game History
// ─────────────────────────────────────────────────────────────
export function useGameHistory(limit = 20, skip = 0) {
  return useQuery({
    queryKey: ['game', 'history', limit, skip],
    queryFn: () => gameApi.getGameHistory(limit, skip),
    staleTime: 30_000,
  });
}

// ─────────────────────────────────────────────────────────────
// My Ticket in active game (by Telegram ID)
// ─────────────────────────────────────────────────────────────
export function useMyTicket(telegramId: string | null) {
  return useQuery<Ticket | null>({
    queryKey: ['ticket', 'me', telegramId],
    queryFn: () => ticketApi.getMyTicket(telegramId!),
    enabled: !!telegramId,
    staleTime: 5_000,
  });
}

// ─────────────────────────────────────────────────────────────
// Available cards in active game
// ─────────────────────────────────────────────────────────────
export function useAvailableCards(enabled = true) {
  return useQuery({
    queryKey: ['tickets', 'available'],
    queryFn: () => ticketApi.getAvailableCards(),
    enabled,
    // Refresh frequently during CARD_SELECTION phase
    refetchInterval: 5_000,
    staleTime: 3_000,
  });
}

// ─────────────────────────────────────────────────────────────
// Single card by number (static — cards never change)
// ─────────────────────────────────────────────────────────────
export function useCard(cardNumber: number | null) {
  return useQuery<BingoCard>({
    queryKey: ['card', cardNumber],
    queryFn: async () => {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/cards/${cardNumber}`,
      );
      if (!res.ok) throw new Error('Failed to fetch card');
      const data = await res.json();
      // Normalise to our BingoCard shape
      return {
        _id: String(cardNumber),
        cardNumber: data.cardNumber,
        matrix: data.matrix as number[],
      };
    },
    enabled: !!cardNumber,
    staleTime: Infinity, // Cards are immutable
    gcTime: Infinity,
  });
}

// ─────────────────────────────────────────────────────────────
// Multiple cards by numbers
// ─────────────────────────────────────────────────────────────
export function useMultipleCards(cardNumbers: number[]) {
  return useQueries({
    queries: cardNumbers.map((cardNumber) => ({
      queryKey: ['card', cardNumber],
      queryFn: async () => {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/cards/${cardNumber}`,
        );
        if (!res.ok) throw new Error('Failed to fetch card');
        const data = await res.json();
        return {
          _id: String(cardNumber),
          cardNumber: data.cardNumber,
          matrix: data.matrix as number[],
        } as BingoCard;
      },
      staleTime: Infinity,
      gcTime: Infinity,
    })),
  });
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

/** Returns the BINGO column letter for a number (1–75) */
export function getColumnForNumber(n: number): 'B' | 'I' | 'N' | 'G' | 'O' {
  if (n <= 15) return 'B';
  if (n <= 30) return 'I';
  if (n <= 45) return 'N';
  if (n <= 60) return 'G';
  return 'O';
}

/**
 * Convert the flat 25-element matrix into a 5×5 grid.
 * matrix[12] === 0 is the FREE cell.
 * Returns rows of { value, isFree }.
 */
export function matrixToGrid(
  matrix: number[],
): { value: number; isFree: boolean }[][] {
  const rows: { value: number; isFree: boolean }[][] = [];
  for (let r = 0; r < 5; r++) {
    const row: { value: number; isFree: boolean }[] = [];
    for (let c = 0; c < 5; c++) {
      const idx = r * 5 + c;
      const val = matrix[idx];
      row.push({ value: val, isFree: val === 0 });
    }
    rows.push(row);
  }
  return rows;
}

/** Phase label for display */
export function phaseLabel(phase: GamePhase): string {
  const labels: Record<GamePhase, string> = {
    [GamePhase.CARD_SELECTION]: 'Card Selection',
    [GamePhase.COUNTDOWN]: 'Starting Soon',
    [GamePhase.DRAWING]: 'Round in Progress',
    [GamePhase.GAME_OVER]: 'Game Over',
  };
  return labels[phase] ?? phase;
}


// ─────────────────────────────────────────────────────────────
// User Profile by Telegram ID
// ─────────────────────────────────────────────────────────────
export function useUserProfile(telegramId: string | null) {
  return useQuery<UserProfile | null>({
    queryKey: ['user', 'profile', telegramId],
    queryFn: () => (telegramId ? userApi.getMe(telegramId) : null),
    enabled: !!telegramId,
    staleTime: 10_000, // Refresh every 10s to keep balance up to date
    refetchInterval: 10_000,
  });
}
