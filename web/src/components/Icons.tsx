/*
  ИКОНКИ

  Рисуем иконки прямо кодом (SVG — "векторная картинка из линий").
  Почему не библиотека иконок: нам нужно всего 4 штуки, а библиотека
  весит много. Почему не картинки PNG: SVG чёткий на любом экране и
  сам перекрашивается под тему через currentColor ("цвет текста вокруг").

  Компонент React — это функция, которая возвращает разметку (JSX).
  JSX выглядит как HTML, но живёт внутри JavaScript.
*/

// Общие настройки для всех иконок: размер 24, линии толщиной 2, без заливки.
const base = {
  width: 24,
  height: 24,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,     // для экранных дикторов: "это украшение, не читай"
}

/** Часы — вкладка "Сегодня" */
export function IconToday() {
  return (
    <svg {...base}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  )
}

/** Календарь — вкладка "Неделя" */
export function IconWeek() {
  return (
    <svg {...base}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4M8 3v4M3 10h18" />
    </svg>
  )
}

/** Ползунки — вкладка "Настройки" */
export function IconSettings() {
  return (
    <svg {...base}>
      <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
      <circle cx="16" cy="7" r="2" />
      <circle cx="10" cy="17" r="2" />
    </svg>
  )
}

/** Лупа — поле поиска группы */
export function IconSearch() {
  return (
    <svg {...base} width={18} height={18}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  )
}

/** Стрелка вправо — в списках */
export function IconChevron() {
  return (
    <svg {...base} width={18} height={18}>
      <path d="m9 6 6 6-6 6" />
    </svg>
  )
}

/** Бумажный самолётик — Telegram-канал */
export function IconTelegram() {
  return (
    <svg {...base} width={20} height={20}>
      <path d="M21 4 3 11l6 2.5L19 7l-8 8 6 5 4-16Z" />
    </svg>
  )
}

/** Шапочка выпускника — дистанционное обучение */
export function IconStudy() {
  return (
    <svg {...base} width={20} height={20}>
      <path d="m2 9 10-5 10 5-10 5L2 9Z" />
      <path d="M6 11v5c3 2 9 2 12 0v-5M22 9v6" />
    </svg>
  )
}

/** Облачко сообщения — обратная связь */
export function IconMessage() {
  return (
    <svg {...base} width={20} height={20}>
      <path d="M4 5h16v11H9l-5 4V5Z" />
    </svg>
  )
}

/** Люди — смена группы */
export function IconGroup() {
  return (
    <svg {...base} width={20} height={20}>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c.8-3.5 3.3-5.5 6.5-5.5s5.7 2 6.5 5.5M16 4.8a3.5 3.5 0 0 1 0 6.4M18 14.8c1.8.8 3 2.5 3.5 5.2" />
    </svg>
  )
}

/** Жирный плюс — добавить заметку */
export function IconPlus() {
  return (
    <svg {...base} width={22} height={22} strokeWidth={3}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

/** Документ — у пары есть заметка */
export function IconNote() {
  return (
    <svg {...base} width={20} height={20}>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z" />
      <path d="M14 3v5h5M9 13h6M9 17h4" />
    </svg>
  )
}

/** Галочка — выбранный вариант */
export function IconCheck() {
  return (
    <svg {...base} width={20} height={20} strokeWidth={2.6}>
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </svg>
  )
}

/** Корзина — удалить заметку */
export function IconTrash() {
  return (
    <svg {...base} width={20} height={20}>
      <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
    </svg>
  )
}
