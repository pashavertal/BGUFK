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
import { findTheme } from '../lib/themes'
import type { ThemePreference } from '../types'

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

  // 'system' → обычная светлая/тёмная по Telegram; неизвестное старое значение → тоже
  const theme = findTheme(preference === 'system' ? systemScheme : preference) ?? findTheme(systemScheme)!
  const resolved = theme.scheme

  useEffect(() => {
    const html = document.documentElement
    html.dataset.theme = resolved      // светлая/тёмная основа
    html.dataset.palette = theme.id    // цвета конкретной темы
    paintTelegramChrome(theme.bg)
  }, [resolved, theme.id, theme.bg])

  return resolved
}
