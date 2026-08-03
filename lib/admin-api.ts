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

export interface AdminGame {
  id: string;
  code: string;
  phase: 'CARD_SELECTION' | 'COUNTDOWN' | 'DRAWING' | 'GAME_OVER';
  ticketPrice: number;
  soldCount: number;
  drawnNumbers: number[];
  createdAt: string;
  winner?: { userId: string; username: string; cardNumber: number };
}

export interface CreateGameParams {
  ticketPrice: number;
  maxPlayers?: number;
  drawIntervalSeconds: number;
  countdownSeconds?: number;
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
      // Fallback so dashboard doesn't crash when endpoint not ready
      return {
        totalRevenue: 0,
        totalUsers: 0,
        totalGames: 0,
        averageTicketPrice: 0,
        revenueGrowth: 0,
        userGrowth: 0,
      };
    }
  },

  // ── Games ──────────────────────────────────────────────────
  getGames: async (params?: { limit?: number; phase?: string }): Promise<AdminGame[]> => {
    try {
      const { data } = await client.get<AdminGame[]>('/admin/games', { params });
      return data;
    } catch {
      return [];
    }
  },

  createGame: async (params: CreateGameParams): Promise<AdminGame> => {
    const { data } = await client.post<AdminGame>('/games', params);
    return data;
  },

  changeGamePhase: async (gameId: string, phase: string): Promise<void> => {
    const phaseToEndpoint: Record<string, string> = {
      COUNTDOWN: `/games/${gameId}/countdown`,
      DRAWING:   `/games/${gameId}/draw`,
      GAME_OVER: `/games/${gameId}/end`,
    };
    const url = phaseToEndpoint[phase];
    if (!url) throw new Error(`Unknown phase transition: ${phase}`);
    await client.post(url);
  },

  manualDraw: async (gameId: string, number?: number): Promise<void> => {
    // The BE auto-draws on its own schedule; manual draw triggers the next one immediately.
    await client.post(`/games/${gameId}/draw`, number !== undefined ? { number } : {});
  },

  declareWinner: async (gameId: string, cardNumber: number): Promise<void> => {
    await client.post(`/games/${gameId}/end`, { cardNumber });
  },

  // ── Tickets ────────────────────────────────────────────────
  refundTicket: async (ticketId: string): Promise<void> => {
    await client.post(`/tickets/${ticketId}/refund`);
  },

  // ── Users ──────────────────────────────────────────────────
  toggleUserBlock: async (telegramId: string, block: boolean): Promise<void> => {
    await client.patch(`/users/block`, { telegramId, block });
  },

  updateUserBalance: async (
    telegramId: string,
    amount: number,
    operation: 'add' | 'subtract' | 'set',
  ): Promise<void> => {
    await client.patch(`/users/balance`, { telegramId, amount, operation });
  },
};
