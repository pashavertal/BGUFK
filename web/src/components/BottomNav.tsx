/*
  НИЖНЕЕ МЕНЮ (3 вкладки по ТЗ)

  Почему меню снизу: на телефоне большой палец достаёт до низа экрана
  легко, а до верха — с трудом. Так сделаны Telegram, Instagram и т.д.
*/
import type { ReactElement } from 'react'
import { hapticSelect } from '../lib/telegram'
import { IconSettings, IconToday, IconWeek } from './Icons'

export type Tab = 'today' | 'week' | 'settings'

// Список вкладок — данные отдельно от разметки. Хочешь 4-ю вкладку —
// добавь строку сюда, а не копируй кнопку.
const TABS: { id: Tab; label: string; icon: () => ReactElement }[] = [
  { id: 'today', label: 'Сегодня', icon: IconToday },
  { id: 'week', label: 'Неделя', icon: IconWeek },
  { id: 'settings', label: 'Настройки', icon: IconSettings },
]

interface Props {
  active: Tab
  onChange: (tab: Tab) => void   // функция, которую вызовем при нажатии
}

export function BottomNav({ active, onChange }: Props) {
  return (
    <nav className="bottom-nav" aria-label="Разделы">
      {/* .map — превратить каждый элемент массива в кнопку */}
      {TABS.map(({ id, label, icon: Icon }) => (
        <button
          key={id}   // key — "паспорт" элемента списка, React по нему отличает кнопки
          type="button"
          className={id === active ? 'nav-item active' : 'nav-item'}
          aria-current={id === active ? 'page' : undefined}
          onClick={() => {
            if (id !== active) hapticSelect()
            onChange(id)
          }}
        >
          <Icon />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  )
}
