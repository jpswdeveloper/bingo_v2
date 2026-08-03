import { useEffect, useState } from 'react';

// ─────────────────────────────────────────────────────────────
// Telegram WebApp SDK Types
// ─────────────────────────────────────────────────────────────
interface TelegramWebAppUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  photo_url?: string;
}

interface TelegramWebApp {
  initData: string;
  initDataUnsafe: {
    query_id?: string;
    user?: TelegramWebAppUser;
    auth_date?: number;
    hash?: string;
    [key: string]: any;
  };
  version: string;
  platform: string;
  colorScheme: 'light' | 'dark';
  themeParams: Record<string, string>;
  isExpanded: boolean;
  viewportHeight: number;
  viewportStableHeight: number;
  headerColor: string;
  backgroundColor: string;
  isClosingConfirmationEnabled: boolean;
  BackButton: {
    isVisible: boolean;
    onClick(callback: () => void): void;
    offClick(callback: () => void): void;
    show(): void;
    hide(): void;
  };
  MainButton: {
    text: string;
    color: string;
    textColor: string;
    isVisible: boolean;
    isActive: boolean;
    isProgressVisible: boolean;
    setText(text: string): void;
    onClick(callback: () => void): void;
    offClick(callback: () => void): void;
    show(): void;
    hide(): void;
    enable(): void;
    disable(): void;
    showProgress(leaveActive?: boolean): void;
    hideProgress(): void;
    setParams(params: Partial<{
      text: string;
      color: string;
      text_color: string;
      is_active: boolean;
      is_visible: boolean;
    }>): void;
  };
  HapticFeedback: {
    impactOccurred(style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft'): void;
    notificationOccurred(type: 'error' | 'success' | 'warning'): void;
    selectionChanged(): void;
  };
  close(): void;
  expand(): void;
  ready(): void;
  sendData(data: string): void;
  openLink(url: string): void;
  openTelegramLink(url: string): void;
  showPopup(params: {
    title?: string;
    message: string;
    buttons?: Array<{ id?: string; type?: string; text?: string }>;
  }, callback?: (buttonId: string) => void): void;
  showAlert(message: string, callback?: () => void): void;
  showConfirm(message: string, callback?: (confirmed: boolean) => void): void;
}

declare global {
  interface Window {
    Telegram?: {
      WebApp: TelegramWebApp;
    };
  }
}

// ─────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────

export interface TelegramUser {
  telegramId: string; // Backend uses string
  firstName: string;
  lastName?: string;
  username?: string;
  languageCode?: string;
  isPremium?: boolean;
  photoUrl?: string;
}

export function useTelegramWebApp() {
  const [webApp, setWebApp] = useState<TelegramWebApp | null>(null);
  const [user, setUser] = useState<TelegramUser | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const tg = window.Telegram?.WebApp;

    if (!tg) {
      // No SDK — running in a browser directly (dev or preview)
      if (process.env.NODE_ENV === 'development') {
        setUser({
          telegramId: '348453405', // teda_ted (dev account)
          firstName: 'Tedy',
          lastName: undefined,
          username: 'teda_ted',
        });
      }
      setIsReady(true);
      return;
    }

    // Initialize the WebApp
    tg.ready();
    tg.expand();

    // Extract user from initDataUnsafe
    const tgUser = tg.initDataUnsafe?.user;

    if (tgUser) {
      setUser({
        telegramId: tgUser.id.toString(),
        firstName: tgUser.first_name,
        lastName: tgUser.last_name,
        username: tgUser.username,
        languageCode: tgUser.language_code,
        isPremium: tgUser.is_premium,
        photoUrl: tgUser.photo_url,
      });
    } else {
      // SDK present but opened in browser — use dev mock
      if (process.env.NODE_ENV === 'development') {
        setUser({
          telegramId: '348453405', // teda_ted from DB
          firstName: 'Tedy',
          username: 'teda_ted',
        });
      }
    }

    setWebApp(tg);
    setIsReady(true);
  }, []);

  return {
    webApp,
    user,
    isReady,
    // Shortcuts
    showAlert: (message: string, callback?: () => void) => webApp?.showAlert(message, callback),
    showConfirm: (message: string, callback?: (ok: boolean) => void) => webApp?.showConfirm(message, callback),
    close: () => webApp?.close(),
    haptic: webApp?.HapticFeedback,
    mainButton: webApp?.MainButton,
    backButton: webApp?.BackButton,
  };
}

// ─────────────────────────────────────────────────────────────
// User balance hook (combines Telegram user + backend balance)
// ─────────────────────────────────────────────────────────────

export function useTelegramUser() {
  const { user, isReady } = useTelegramWebApp();
  return { user, isReady };
}
