/*
  РАБОТА СО ВРЕМЕНЕМ И ДАТАМИ

  Главная ловушка: часовые пояса. Если студент полетел в Москву или у него
  на телефоне сбит пояс, "сейчас 8:40" на телефоне ≠ "8:40 в Минске".
  А пары идут по МИНСКОМУ времени. Поэтому мы всегда считаем время так,
  как будто смотрим на часы в Минске (часовой пояс 'Europe/Minsk').

  Даты храним строками "2026-11-02" (формат ISO). Почему строки, а не Date:
    - так же они записаны в JSON;
    - их можно сравнивать как строки: "2026-11-02" < "2026-11-10" — верно;
    - нет сюрпризов с часовыми поясами при переводе туда-обратно.
*/

const TIME_ZONE = 'Europe/Minsk'

export interface Now {
  date: string      // "2026-11-08"
  minutes: number   // минут с начала суток: 8:30 -> 510
}

/**
  Узнать "сейчас" по Минску.
  Intl.DateTimeFormat — встроенный в браузер "переводчик дат".
  formatToParts разбивает дату на кусочки: год, месяц, день, час, минута.
  'en-CA' выбран потому, что даёт числа в удобном виде (2026, 11, 08).
*/
export function minskNow(): Now {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date())

  // Достаём кусочек по имени: get('year') -> "2026"
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '00'
  // ?. — "если не нашли, не падай, верни undefined"; ?? — "если undefined, возьми '00'"

  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    minutes: Number(get('hour')) * 60 + Number(get('minute')),
  }
}

/** "08:30" -> 510 минут. Так время легко сравнивать и вычитать. */
export function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

/**
  Превратить строку-дату в объект Date в UTC.
  'T00:00:00Z' — полночь по Гринвичу. Так день недели не "уедет" из-за пояса.
*/
function utcDate(iso: string): Date {
  return new Date(`${iso}T00:00:00Z`)
}

/** Сдвинуть дату на N дней: addDays("2026-11-08", 1) -> "2026-11-09" */
export function addDays(iso: string, days: number): string {
  const d = utcDate(iso)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)   // "2026-11-09T00:00:00.000Z" -> "2026-11-09"
}

/** День недели: 0 = понедельник ... 6 = воскресенье (как в России/Беларуси) */
export function weekdayIndex(iso: string): number {
  // getUTCDay(): 0 = воскресенье. Сдвигаем, чтобы неделя начиналась с понедельника.
  return (utcDate(iso).getUTCDay() + 6) % 7
}

/** Понедельник той недели, в которой находится дата */
export function mondayOf(iso: string): string {
  return addDays(iso, -weekdayIndex(iso))
}

export const WEEKDAY_SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
const WEEKDAY_LONG = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье']
const MONTHS_GENITIVE = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля',
  'августа', 'сентября', 'октября', 'ноября', 'декабря']

/** "2026-11-08" -> "Воскресенье, 8 ноября" */
export function formatLongDate(iso: string): string {
  const [, month, day] = iso.split('-').map(Number)
  return `${WEEKDAY_LONG[weekdayIndex(iso)]}, ${day} ${MONTHS_GENITIVE[month - 1]}`
}

/** "2026-11-08" -> 8 (число месяца) */
export function dayOfMonth(iso: string): number {
  return Number(iso.slice(8, 10))
}

/** "2026-11-02" -> "2 ноября" */
export function formatShortDate(iso: string): string {
  const [, month, day] = iso.split('-').map(Number)
  return `${day} ${MONTHS_GENITIVE[month - 1]}`
}

/**
  Правильное окончание слова по числу (русская грамматика):
  plural(1, ['минута','минуты','минут']) -> "минута"
  plural(3, ...) -> "минуты", plural(11, ...) -> "минут"
*/
export function plural(n: number, forms: [string, string, string]): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return forms[0]
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return forms[1]
  return forms[2]
}

/** 95 минут -> "1 ч 35 мин"; 20 -> "20 минут" */
export function formatDuration(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  if (h === 0) return `${m} ${plural(m, ['минуту', 'минуты', 'минут'])}`
  return m === 0 ? `${h} ч` : `${h} ч ${m} мин`
}

/** "08:30" -> "8:30" */
export function shortTime(hhmm: string): string {
  return hhmm.replace(/^0/, '')
}

/** Длина перемены: 15 -> "15 мин", 95 -> "1 ч 35 мин" */
export function formatGap(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  if (h === 0) return `${m} мин`
  return m === 0 ? `${h} ч` : `${h} ч ${m} мин`
}

/** "2026-11-12" -> "четверг" */
export function weekdayLower(iso: string): string {
  return WEEKDAY_LONG[weekdayIndex(iso)].toLowerCase()
}
