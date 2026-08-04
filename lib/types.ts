// ─────────────────────────────────────────────────────────────
// Game Phase Enum
// ─────────────────────────────────────────────────────────────
export enum GamePhase {
  CARD_SELECTION = 'CARD_SELECTION',
  COUNTDOWN = 'COUNTDOWN',
  DRAWING = 'DRAWING',
  GAME_OVER = 'GAME_OVER',
}

// ─────────────────────────────────────────────────────────────
// Win Pattern Enum
// ─────────────────────────────────────────────────────────────
export enum WinPattern {
  SINGLE_LINE = 'SINGLE_LINE',
  DOUBLE_LINE = 'DOUBLE_LINE',
  FULL_HOUSE = 'FULL_HOUSE',
  FOUR_CORNERS = 'FOUR_CORNERS',
}

// ─────────────────────────────────────────────────────────────
// Game State (from Redis/Backend)
// ─────────────────────────────────────────────────────────────
export interface GameState {
  gameId: string;
  gameCode: string;
  phase: GamePhase;
  ticketPrice: number;
  winPattern: WinPattern;
  drawnNumbers: number[];
  currentDraw: number | null;
  drawCount: number;
  remaining: number;
  countdownSeconds: number;
  countdownStartedAt?: number | null;
  drawIntervalSeconds: number;
  soldCardNumbers: number[];   // the raw array from Redis
  // convenience getters derived on frontend
  soldCount: number;
  availableCount: number;
}

// ─────────────────────────────────────────────────────────────
// Ticket (User's purchased card)
// ─────────────────────────────────────────────────────────────
export interface Ticket {
  id: string;
  gameId: string;
  userId?: string;
  telegramId: string;
  cardNumber: number;
  pricePaid?: number;
  isWinner?: boolean;
}

// ─────────────────────────────────────────────────────────────
// Bingo Card (the actual 5x5 matrix)
// ─────────────────────────────────────────────────────────────
export interface BingoCard {
  _id: string;
  cardNumber: number;
  matrix: number[]; // flat 25-element array; index 12 === 0 (FREE)
}

// ─────────────────────────────────────────────────────────────
// WebSocket Event Payloads
// ─────────────────────────────────────────────────────────────
export interface PhaseChangePayload {
  gameId: string;
  gameCode: string;
  phase: GamePhase;
  countdownSeconds: number;
  countdownStartedAt: number | null; // epoch ms — needed to compute remaining time
  timestamp: number;
}

export interface NumberDrawnPayload {
  gameId: string;
  gameCode: string;
  phase: GamePhase;
  drawnNumber: number;
  allDrawn: number[];
  drawCount: number;
  remaining: number;
  timestamp: number;
}

export interface GameOverPayload {
  gameId: string;
  gameCode: string;
  phase: GamePhase;
  winnerId: string | null;
  winningCardNumber: number | null;
  totalDrawn: number;
  drawnNumbers: number[];
  timestamp: number;
}

export interface TicketSoldPayload {
  gameId: string;
  gameCode: string;
  cardNumber: number;
  remainingCount: number;
  timestamp: number;
}

export interface InvalidClaimPayload {
  gameId: string;
  userId: string;
  cardNumber: number;
  timestamp: number;
}

// ─────────────────────────────────────────────────────────────
// API Response Types
// ─────────────────────────────────────────────────────────────
export interface UserProfile {
  id: string;
  telegramId: string;
  firstName: string;
  lastName?: string;
  username?: string;
  phoneNumber?: string;
  walletBalance: number;   // game balance — used to buy tickets
  mainWallet: number;      // winnings wallet — used for cashouts
  isVerified: boolean;
  isBlocked: boolean;
  referralCode: string;
  role: string;
}

export interface AvailableCardsResponse {
  available: number[];
  sold: number[];
  total: number;
}

export interface BuyTicketResponse {
  success: boolean;
  ticket: {
    id: string;
    gameId: string;
    cardNumber: number;
    pricePaid: number;
    telegramId: string;
  };
}

// ─────────────────────────────────────────────────────────────
// Cashout
// ─────────────────────────────────────────────────────────────
export type CashoutStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface CashoutRequest {
  _id: string;
  telegramId: string;
  amount: number;
  phoneNumber: string;
  status: CashoutStatus;
  adminNote: string | null;
  reviewedAt: string | null;
  reviewedBy: string | null;
  createdAt: string;
}

// ─────────────────────────────────────────────────────────────
// Settings — rake tiers
// ─────────────────────────────────────────────────────────────
export interface RakeTier {
  minCards: number;
  maxCards: number;
  rakePct: number;
}
