/*
  ОПИСАНИЕ ТИПОВ ДЛЯ TELEGRAM

  Файл .d.ts ("d" = declaration, объявление) не содержит кода — только
  описания. Скрипт telegram-web-app.js написан на обычном JS, и TypeScript
  ничего не знает о window.Telegram. Здесь мы ему "рассказываем":
  "поверь, в window есть Telegram.WebApp, и у него вот такие функции".

  Аналогия: инструкция к чужому прибору. Сам прибор (скрипт) уже есть,
  а мы пишем к нему инструкцию, чтобы не нажимать несуществующие кнопки.

  Мы описываем ТОЛЬКО то, чем пользуемся. Полный список — в документации:
  https://core.telegram.org/bots/webapps
*/

interface TelegramBackButton {
  show(): void
  hide(): void
  onClick(callback: () => void): void
  offClick(callback: () => void): void
}

interface TelegramHapticFeedback {
  // Лёгкая вибрация при выборе (как "щелчок" колёсика на iPhone)
  selectionChanged(): void
  impactOccurred(style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft'): void
}

interface TelegramWebApp {
  /** Сказать Telegram "я загрузился" — он уберёт свой экран загрузки */
  ready(): void
  /** Развернуть мини-апп на весь экран */
  expand(): void
  /** Тема Telegram у пользователя прямо сейчас */
  colorScheme: 'light' | 'dark'
  /** Версия Telegram API, например "8.0" */
  version: string
  /** Пустая строка, если открыто НЕ в Telegram (просто в браузере) */
  initData: string
  isVersionAtLeast(version: string): boolean
  setHeaderColor(color: string): void
  setBackgroundColor(color: string): void
  openLink(url: string): void
  onEvent(event: 'themeChanged', callback: () => void): void
  offEvent(event: 'themeChanged', callback: () => void): void
  BackButton: TelegramBackButton
  HapticFeedback: TelegramHapticFeedback
}

// "Дописываем" стандартный тип Window: добавляем поле Telegram.
// Знак ? — потому что вне Telegram скрипт может не загрузиться (нет интернета).
interface Window {
  Telegram?: { WebApp: TelegramWebApp }
}
