/*
  ОБЁРТКА НАД TELEGRAM

  Зачем обёртка, если есть window.Telegram.WebApp:
    1. Мини-апп можно открыть и в обычном браузере (для разработки).
       Там Telegram-функции частично не работают. Обёртка проверяет это
       в ОДНОМ месте, а не в каждом экране.
    2. Старые версии Telegram не знают новых функций — вызов выдаст
       предупреждение. Проверяем версию заранее.
  Аналогия: переходник для розетки. Экраны просто "втыкают вилку",
  а переходник разбирается, какая розетка в стене.
*/

/** Объект Telegram или undefined, если мы не в Telegram */
export const tg: TelegramWebApp | undefined = window.Telegram?.WebApp

/** Открыто ли приложение действительно внутри Telegram */
export const isInsideTelegram = Boolean(tg?.initData)

/** Безопасно проверить версию API Telegram */
function supports(version: string): boolean {
  return Boolean(tg && isInsideTelegram && tg.isVersionAtLeast(version))
}

/** Вызвать один раз при старте: "готов" + развернуть на весь экран */
export function initTelegram(): void {
  if (!tg) return
  tg.ready()
  tg.expand()
}

/** Тема, которая сейчас стоит в Telegram (или в системе, если открыто в браузере) */
export function telegramColorScheme(): 'light' | 'dark' {
  if (tg && isInsideTelegram) return tg.colorScheme
  // matchMedia — спросить браузер "у пользователя тёмная тема в системе?"
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

/** Покрасить шапку и фон Telegram в цвета нашей темы (Telegram 6.1+) */
export function paintTelegramChrome(background: string): void {
  if (!tg || !supports('6.1')) return
  tg.setHeaderColor(background)
  tg.setBackgroundColor(background)
}

/** Лёгкая вибрация при выборе (Telegram 6.1+). На ПК просто ничего не будет. */
export function hapticSelect(): void {
  if (tg && supports('6.1')) tg.HapticFeedback.selectionChanged()
}

/**
  Показать системную кнопку "Назад" в шапке Telegram (6.1+).
  Возвращает функцию "убрать кнопку" — React вызовет её, когда экран закроется.
*/
export function showBackButton(onBack: () => void): () => void {
  if (!tg || !supports('6.1')) return () => {}
  tg.BackButton.onClick(onBack)
  tg.BackButton.show()
  return () => {
    tg.BackButton.offClick(onBack)
    tg.BackButton.hide()
  }
}

/** Открыть ссылку: в Telegram — во встроенном браузере, иначе в новой вкладке */
export function openLink(url: string): void {
  if (tg && isInsideTelegram) tg.openLink(url)
  else window.open(url, '_blank', 'noopener')
}
