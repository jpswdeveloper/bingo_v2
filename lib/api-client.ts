import axios from 'axios';
import type {
  GameState,
  BingoCard,
  Ticket,
  AvailableCardsResponse,
  BuyTicketResponse,
  UserProfile,
} from './types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    // Skip ngrok's browser warning interstitial page
    'ngrok-skip-browser-warning': '1',
  },
});

// ─────────────────────────────────────────────────────────────
// User APIs
// ─────────────────────────────────────────────────────────────

export const userApi = {
  /**
   * Get user profile by telegramId
   */
  getMe: async (telegramId: string): Promise<UserProfile> => {
    const { data } = await apiClient.get<UserProfile>('/users/me', {
      params: { telegramId },
    });
    return data;
  },
};

// ─────────────────────────────────────────────────────────────
// Game APIs
// ─────────────────────────────────────────────────────────────

export const gameApi = {
  /**
   * JOIN OR CREATE — called when user clicks a stake on home page.
   * Creates a game if none exists for that ticketPrice, otherwise returns existing.
   */
  joinOrCreate: async (ticketPrice: number): Promise<{
    gameId: string;
    gameCode: string;
    phase: string;
    ticketPrice: number;
  }> => {
    const { data } = await apiClient.post('/games/join', { ticketPrice });
    return data;
  },

  /**
   * Get the currently active game state
   */
  getActiveGame: async (): Promise<GameState | null> => {
    const { data } = await apiClient.get<GameState | { message: string }>(
      '/games/active',
    );
    if ('message' in data) return null;
    // Derive convenience counts from the raw array
    const state = data as GameState;
    state.soldCount = state.soldCardNumbers?.length ?? 0;
    state.availableCount = 600 - state.soldCount;
    state.drawCount = state.drawnNumbers?.length ?? 0;
    state.remaining = 75 - state.drawCount;
    return state;
  },

  /**
   * Get a specific game by ID
   */
  getGameById: async (gameId: string) => {
    const { data } = await apiClient.get(`/games/${gameId}`);
    return data;
  },

  /**
   * Get game history (paginated)
   */
  getGameHistory: async (limit = 20, skip = 0) => {
    const { data } = await apiClient.get('/games/history', {
      params: { limit, skip },
    });
    return data;
  },
};

// ─────────────────────────────────────────────────────────────
// Ticket APIs
// ─────────────────────────────────────────────────────────────

export const ticketApi = {
  /**
   * Purchase a ticket/card
   */
  buyTicket: async (
    telegramId: string,
    cardNumber: number,
  ): Promise<BuyTicketResponse> => {
    const { data } = await apiClient.post<BuyTicketResponse>('/tickets/buy', {
      telegramId,
      cardNumber,
    });
    return data;
  },

  /**
   * Purchase multiple tickets/cards at once
   */
  buyTicketBatch: async (
    telegramId: string,
    cardNumbers: number[],
  ): Promise<{ success: boolean; tickets: any[] }> => {
    const { data } = await apiClient.post<{ success: boolean; tickets: any[] }>('/tickets/buy-batch', {
      telegramId,
      cardNumbers,
    });
    return data;
  },

  /**
   * Get available cards in the active game
   */
  getAvailableCards: async (): Promise<AvailableCardsResponse> => {
    const { data } = await apiClient.get<AvailableCardsResponse>(
      '/tickets/available',
    );
    return data;
  },

  /**
   * Check if a specific card is available
   */
  isCardAvailable: async (
    cardNumber: number,
  ): Promise<{ cardNumber: number; available: boolean }> => {
    const { data } = await apiClient.get(`/tickets/available/${cardNumber}`);
    return data;
  },

  /**
   * Get user's ticket in active game (by Telegram ID)
   * Returns null if the user has no ticket (404 is not an error)
   */
  getMyTicket: async (telegramId: string): Promise<Ticket | null> => {
    try {
      const { data } = await apiClient.get('/tickets/me', {
        params: { telegramId },
      });
      return data;
    } catch (err: any) {
      if (err?.response?.status === 404) return null;
      throw err;
    }
  },

  /**
   * Get all tickets for a game
   */
  getTicketsForGame: async (gameId: string, userId?: string) => {
    const { data } = await apiClient.get(`/tickets/game/${gameId}`, {
      params: userId ? { userId } : undefined,
    });
    return data;
  },

  /**
   * Get user's ticket history
   */
  getUserHistory: async (userId: string, limit = 20, skip = 0) => {
    const { data } = await apiClient.get(`/tickets/user/${userId}/history`, {
      params: { limit, skip },
    });
    return data;
  },
};

// ─────────────────────────────────────────────────────────────
// Cards APIs
// ─────────────────────────────────────────────────────────────

export const cardApi = {
  /**
   * Get a specific card by number
   */
  getCardByNumber: async (cardNumber: number): Promise<BingoCard> => {
    const { data } = await apiClient.get<BingoCard>(
      `/cards/${cardNumber}`,
    );
    return data;
  },
};

export default apiClient;
