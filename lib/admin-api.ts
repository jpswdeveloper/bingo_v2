import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

const client = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': '1',
  },
});

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export type GamePhase = 'CARD_SELECTION' | 'COUNTDOWN' | 'DRAWING' | 'GAME_OVER';
export type WinPattern = 'ROW' | 'COLUMN' | 'DIAGONAL' | 'FULL_HOUSE';

export interface AdminGame {
  gameId: string;
  gameCode: string;
  phase: GamePhase;
  ticketPrice: number;
  winPattern: WinPattern;
  soldCount: number;
  soldCardNumbers: number[];
  drawnNumbers: number[];
  currentDraw: number | null;
  countdownSeconds: number;
  countdownStartedAt: number | null;
  drawIntervalSeconds: number;
}

export interface CreateGameParams {
  ticketPrice: number;
  purchasingSeconds?: number;
  countdownSeconds?: number;
  drawIntervalSeconds?: number;
  winPattern?: WinPattern;
}

export interface AnalyticsOverview {
  totalRevenue: number;
  totalUsers: number;
  totalGames: number;
  averageTicketPrice: number;
  revenueGrowth: number;
  userGrowth: number;
}

// ─────────────────────────────────────────────────────────────
// Admin API
// ─────────────────────────────────────────────────────────────

export const adminApi = {
  // ── Analytics ─────────────────────────────────────────────
  getAnalyticsOverview: async (): Promise<AnalyticsOverview> => {
    try {
      const { data } = await client.get<AnalyticsOverview>('/admin/analytics/overview');
      return data;
    } catch {
      return { totalRevenue: 0, totalUsers: 0, totalGames: 0, averageTicketPrice: 0, revenueGrowth: 0, userGrowth: 0 };
    }
  },

  // ── Games ──────────────────────────────────────────────────

  /** GET /games/active — the single active game */
  getActiveGame: async (): Promise<AdminGame | null> => {
    try {
      const { data } = await client.get<AdminGame | { message: string }>('/games/active');
      if ('message' in data) return null;
      const g = data as AdminGame;
      g.soldCount = g.soldCardNumbers?.length ?? 0;
      return g;
    } catch {
      return null;
    }
  },

  /** GET /games/history?limit=20&skip=0 */
  getGameHistory: async (limit = 20, skip = 0): Promise<AdminGame[]> => {
    try {
      const { data } = await client.get<AdminGame[]>('/games/history', { params: { limit, skip } });
      return data;
    } catch {
      return [];
    }
  },

  /** POST /games — create and immediately start purchasing phase */
  createGame: async (params: CreateGameParams): Promise<AdminGame> => {
    const { data } = await client.post<AdminGame>('/games', params);
    return data;
  },

  /** POST /games/:id/countdown — CARD_SELECTION → COUNTDOWN */
  startCountdown: async (gameId: string): Promise<void> => {
    await client.post(`/games/${gameId}/countdown`);
  },

  /** POST /games/:id/draw — COUNTDOWN → DRAWING (skips remaining countdown) */
  startDrawing: async (gameId: string): Promise<void> => {
    await client.post(`/games/${gameId}/draw`);
  },

  /** POST /games/:id/end — force-end the game */
  endGame: async (gameId: string): Promise<void> => {
    await client.post(`/games/${gameId}/end`);
  },

  // Aliases for legacy admin page calls
  getGames: async (params?: { limit?: number }): Promise<AdminGame[]> => {
    return adminApi.getGameHistory(params?.limit ?? 20);
  },
  changeGamePhase: async (gameId: string, phase: string): Promise<void> => {
    if (phase === 'COUNTDOWN') return adminApi.startCountdown(gameId);
    if (phase === 'DRAWING')   return adminApi.startDrawing(gameId);
    return adminApi.endGame(gameId);
  },
  manualDraw: async (gameId: string, _number?: number): Promise<void> => {
    await adminApi.startDrawing(gameId);
  },
  declareWinner: async (gameId: string, _cardNumber: number): Promise<void> => {
    await adminApi.endGame(gameId);
  },

  // ── Tickets ────────────────────────────────────────────────
  refundTicket: async (ticketId: string): Promise<void> => {
    await client.post(`/tickets/${ticketId}/refund`);
  },

  // ── Users ──────────────────────────────────────────────────
  toggleUserBlock: async (telegramId: string, block: boolean): Promise<void> => {
    await client.patch('/users/block', { telegramId, block });
  },

  updateUserBalance: async (telegramId: string, amount: number, operation: 'add' | 'subtract' | 'set'): Promise<void> => {
    await client.patch('/users/balance', { telegramId, amount, operation });
  },
};
