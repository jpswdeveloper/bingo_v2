import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import type {
  GameState,
  PhaseChangePayload,
  NumberDrawnPayload,
  GameOverPayload,
  TicketSoldPayload,
  InvalidClaimPayload,
} from './types';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3000';

export const WS_EVENTS = {
  // Server → Client
  GAME_STATE:    'game:state',
  PHASE_CHANGE:  'game:phase',
  NUMBER_DRAWN:  'game:draw',
  GAME_OVER:     'game:over',
  INVALID_CLAIM: 'game:invalid_claim',
  TICKET_SOLD:   'game:ticket_sold',
  ERROR:         'error',
  // Client → Server
  JOIN_GAME:     'join:game',
  LEAVE_GAME:    'leave:game',
  CLAIM_BINGO:   'claim:bingo',
  REQUEST_STATE: 'request:state',
} as const;

interface UseBingoSocketOptions {
  gameId: string | null;
  userId?: string;
  onGameState?:    (state: GameState) => void;
  onPhaseChange?:  (payload: PhaseChangePayload) => void;
  onNumberDrawn?:  (payload: NumberDrawnPayload) => void;
  onGameOver?:     (payload: GameOverPayload) => void;
  onTicketSold?:   (payload: TicketSoldPayload) => void;
  onInvalidClaim?: (payload: InvalidClaimPayload) => void;
  onError?:        (error: { message: string }) => void;
}

export function useBingoSocket(options: UseBingoSocketOptions) {
  const { gameId, userId } = options;

  // ── Keep latest callbacks in refs so the socket effect never needs
  //    to re-run (and re-connect) just because a callback changed.
  const cbRef = useRef(options);
  useEffect(() => { cbRef.current = options; });   // sync every render, no deps needed

  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [currentGameState, setCurrentGameState] = useState<GameState | null>(null);

  // ── Single socket lifecycle — only re-runs if gameId changes ──
  useEffect(() => {
    if (!gameId) return;

    console.log('[Socket] Connecting to', WS_URL, 'gameId:', gameId);

    const socket = io(`${WS_URL}/bingo`, {
      // Start with polling — more reliable across tunnels and proxies.
      // Socket.IO will automatically upgrade to WebSocket once connected.
      transports: ['polling', 'websocket'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
      extraHeaders: { 'ngrok-skip-browser-warning': '1' },
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[Socket] Connected:', socket.id, '— joining game:', gameId);
      setIsConnected(true);
      socket.emit(WS_EVENTS.JOIN_GAME, { gameId });
    });

    // On reconnect (after a temporary drop), re-join the room
    socket.io.on('reconnect', () => {
      console.log('[Socket] Reconnected — re-joining game:', gameId);
      socket.emit(WS_EVENTS.JOIN_GAME, { gameId });
    });

    socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
      setIsConnected(false);
    });

    socket.on('connect_error', (error) => {
      // "websocket error" is normal — it just means the WS upgrade failed
      // and Socket.IO will fall back to polling automatically. Only log
      // non-transient errors.
      const msg = error.message ?? '';
      if (msg === 'websocket error') {
        console.warn('[Socket] WS transport failed, falling back to polling...');
      } else {
        console.error('[Socket] Connection error:', msg);
        cbRef.current.onError?.({ message: msg });
      }
    });

    // ── Event handlers — always call through cbRef so they're fresh ──
    socket.on(WS_EVENTS.GAME_STATE, (state: GameState) => {
      console.log('[Socket] game:state phase=', state.phase, 'drawn=', state.drawnNumbers?.length);
      setCurrentGameState(state);
      cbRef.current.onGameState?.(state);
    });

    socket.on(WS_EVENTS.PHASE_CHANGE, (payload: PhaseChangePayload) => {
      console.log('[Socket] game:phase →', payload.phase);
      cbRef.current.onPhaseChange?.(payload);
    });

    socket.on(WS_EVENTS.NUMBER_DRAWN, (payload: NumberDrawnPayload) => {
      console.log('[Socket] game:draw', payload.drawnNumber, '(', payload.drawCount, '/75)');
      cbRef.current.onNumberDrawn?.(payload);
    });

    socket.on(WS_EVENTS.GAME_OVER, (payload: GameOverPayload) => {
      console.log('[Socket] game:over winner=', payload.winnerId);
      cbRef.current.onGameOver?.(payload);
    });

    socket.on(WS_EVENTS.TICKET_SOLD, (payload: TicketSoldPayload) => {
      console.log('[Socket] game:ticket_sold card=', payload.cardNumber);
      cbRef.current.onTicketSold?.(payload);
    });

    socket.on(WS_EVENTS.INVALID_CLAIM, (payload: InvalidClaimPayload) => {
      console.log('[Socket] game:invalid_claim', payload);
      cbRef.current.onInvalidClaim?.(payload);
    });

    socket.on(WS_EVENTS.ERROR, (error: { message: string }) => {
      console.error('[Socket] server error:', error);
      cbRef.current.onError?.(error);
    });

    return () => {
      console.log('[Socket] Cleanup — leaving game:', gameId);
      socket.emit(WS_EVENTS.LEAVE_GAME, { gameId });
      socket.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    };
  }, [gameId]); // gameId is the only structural dependency

  const claimBingo = useCallback(
    (cardNumber: number) => {
      const sock = socketRef.current;
      const uid = cbRef.current.userId ?? userId;
      const gid = cbRef.current.gameId ?? gameId;
      if (!sock?.connected || !gid || !uid) {
        console.error('[Socket] Cannot claim BINGO — not ready', { connected: sock?.connected, gid, uid });
        return;
      }
      sock.emit(WS_EVENTS.CLAIM_BINGO, { gameId: gid, userId: uid, cardNumber });
    },
    // intentionally empty deps — reads live values through refs
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const requestState = useCallback(() => {
    const sock = socketRef.current;
    const gid = cbRef.current.gameId ?? gameId;
    if (!sock?.connected || !gid) return;
    sock.emit(WS_EVENTS.REQUEST_STATE, { gameId: gid });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    isConnected,
    currentGameState,
    claimBingo,
    requestState,
    socket: socketRef.current,
  };
}
