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
