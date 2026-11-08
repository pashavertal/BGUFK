/*
  ХУК useTheme — светлая / тёмная тема

  Как это работает:
    - Пользователь выбирает: "Как в Telegram", "Светлая" или "Тёмная".
    - Мы вычисляем ИТОГОВУЮ тему (light/dark) и ставим её атрибутом
      на <html data-theme="dark">.
    - В CSS для [data-theme="dark"] прописаны тёмные цвета.
  Аналогия: в комнате висит табличка "сейчас ночь" — и все лампы (CSS)
  сами переключаются в ночной режим. Нам не нужно перекрашивать каждую кнопку.
*/
import { useEffect, useState } from 'react'
import { paintTelegramChrome, telegramColorScheme, tg } from '../lib/telegram'
import type { ThemePreference } from '../types'

// Цвета фона — те же, что --bg в index.css. Нужны, чтобы покрасить шапку Telegram.
const BACKGROUND = { light: '#F3F6F4', dark: '#0E1411' } as const

export function useTheme(preference: ThemePreference): 'light' | 'dark' {
  // Тема Telegram может поменяться, пока приложение открыто — следим за ней.
  const [systemScheme, setSystemScheme] = useState(telegramColorScheme)

  useEffect(() => {
    const update = () => setSystemScheme(telegramColorScheme())
    tg?.onEvent('themeChanged', update)
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    media.addEventListener('change', update)
    return () => {
      tg?.offEvent('themeChanged', update)
      media.removeEventListener('change', update)
    }
  }, [])

  const resolved = preference === 'system' ? systemScheme : preference

  useEffect(() => {
    document.documentElement.dataset.theme = resolved   // <html data-theme="...">
    paintTelegramChrome(BACKGROUND[resolved])
  }, [resolved])

  return resolved
}
