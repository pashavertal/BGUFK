/*
  ТЕМЫ ОФОРМЛЕНИЯ
  Цвета каждой темы — в index.css, блок [data-palette="id"].
  Здесь только список для настроек: название, светлая/тёмная и цвет фона
  (им красим шапку Telegram, он совпадает с --bg темы).
*/

export const THEMES = [
  { id: 'linen', label: 'Лён', scheme: 'dark', bg: '#141311' },
  { id: 'paper', label: 'Бумага', scheme: 'light', bg: '#F4EFE6' },
  { id: 'cobalt', label: 'Кобальт', scheme: 'light', bg: '#EDF0FA' },
  { id: 'graphite', label: 'Графит', scheme: 'dark', bg: '#172B33' },
  { id: 'dark', label: 'Тёмная', scheme: 'dark', bg: '#0E1411' },
  { id: 'light', label: 'Светлая', scheme: 'light', bg: '#F3F6F4' },
  { id: 'midnight', label: 'Полночь', scheme: 'dark', bg: '#000000' },
  { id: 'contrast', label: 'Контраст', scheme: 'dark', bg: '#000000' },
  { id: 'beige', label: 'Беж', scheme: 'light', bg: '#F3EEE4' },
  { id: 'sky', label: 'Небо', scheme: 'light', bg: '#DCEFFB' },
  { id: 'azure', label: 'Лазурь', scheme: 'dark', bg: '#0A1426' },
  { id: 'mint', label: 'Мята', scheme: 'dark', bg: '#1E2224' },
  { id: 'ultra', label: 'Ультра', scheme: 'dark', bg: '#15122A' },
  { id: 'indigo', label: 'Индиго', scheme: 'dark', bg: '#181A4A' },
] as const

export type ThemeId = (typeof THEMES)[number]['id']

export function findTheme(id: string) {
  return THEMES.find((t) => t.id === id)
}
