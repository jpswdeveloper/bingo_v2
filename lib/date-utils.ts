/**
 * Date formatting utilities — always display in GMT+3 (Africa/Nairobi / EAT).
 * The BE stores UTC and the DateInterceptor converts to GMT+3 ISO strings on REST
 * responses. For WS payloads (raw epoch ms) use these helpers to format for display.
 */

const TZ = 'Africa/Nairobi'; // UTC+3, no DST

const fmt = (opts: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat('en-ET', { timeZone: TZ, ...opts });

/** "14:32:05" */
export function formatTime(date: Date | number): string {
  const d = typeof date === 'number' ? new Date(date) : date;
  return fmt({ hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).format(d);
}

/** "03 Aug 2026" */
export function formatDate(date: Date | number): string {
  const d = typeof date === 'number' ? new Date(date) : date;
  return fmt({ day: '2-digit', month: 'short', year: 'numeric' }).format(d);
}

/** "03 Aug 2026, 14:32" */
export function formatDateTime(date: Date | number): string {
  const d = typeof date === 'number' ? new Date(date) : date;
  return fmt({
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).format(d);
}

/** "14:32" — short time for tight UI */
export function formatTimeShort(date: Date | number): string {
  const d = typeof date === 'number' ? new Date(date) : date;
  return fmt({ hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(d);
}

/** Elapsed seconds between now and a past epoch ms timestamp */
export function secondsElapsed(startEpochMs: number): number {
  return Math.floor((Date.now() - startEpochMs) / 1000);
}

/** Remaining seconds from a startEpochMs + durationSeconds window */
export function secondsRemaining(startEpochMs: number, durationSeconds: number): number {
  const elapsed = (Date.now() - startEpochMs) / 1000;
  return Math.max(0, Math.ceil(durationSeconds - elapsed));
}
