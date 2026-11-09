/*
  ЭКРАН 1: ПАРЫ НА СЕГОДНЯ

  Сверху большой виджет:
    - если пара идёт сейчас → "Сейчас идёт" + сколько осталось + полоска;
    - если перерыв или утро → "Следующая пара через N минут";
    - если всё закончилось → "Пары на сегодня закончились";
    - если пар нет → "Сегодня пар нет".
  Ниже — остальные пары помельче. Прошедшие — бледные.

  Вся логика "что сейчас" — в функции pickHighlight. Она "чистая":
  получает данные и возвращает ответ, ничего не меняя вокруг.
  Такие функции легко проверять и понимать (вход → выход).
*/
import { LessonCard } from '../components/LessonCard'
import { useNow } from '../hooks/useNow'
import { formatDuration, formatLongDate, toMinutes, type Now } from '../lib/time'
import type { GroupSchedule, Lesson } from '../types'

type Highlight =
  | { kind: 'current'; lessons: Lesson[]; minutesLeft: number; progress: number }
  | { kind: 'next'; lessons: Lesson[]; minutesUntil: number }
  | { kind: 'finished' }
  | { kind: 'none' }
// Это "размеченное объединение": по полю kind TypeScript понимает, какие
// ещё поля есть. Если kind === 'current', то точно есть minutesLeft.

function pickHighlight(lessons: Lesson[], now: Now): Highlight {
  if (lessons.length === 0) return { kind: 'none' }

  // Пары, которые идут прямо сейчас (у подгрупп может быть 2 пары одновременно).
  const current = lessons.filter(
    (l) => toMinutes(l.start) <= now.minutes && now.minutes < toMinutes(l.end),
  )
  if (current.length > 0) {
    const start = toMinutes(current[0].start)
    const end = toMinutes(current[0].end)
    return {
      kind: 'current',
      lessons: current,
      minutesLeft: end - now.minutes,
      progress: (now.minutes - start) / (end - start),
    }
  }

  // Ближайшая будущая пара (и все, что начинаются в то же время).
  const upcoming = lessons.filter((l) => toMinutes(l.start) > now.minutes)
  if (upcoming.length > 0) {
    const start = upcoming[0].start
    return {
      kind: 'next',
      lessons: upcoming.filter((l) => l.start === start),
      minutesUntil: toMinutes(start) - now.minutes,
    }
  }
  return { kind: 'finished' }
}

function lessonState(lesson: Lesson, now: Now): 'past' | 'current' | 'upcoming' {
  if (toMinutes(lesson.end) <= now.minutes) return 'past'
  if (toMinutes(lesson.start) <= now.minutes) return 'current'
  return 'upcoming'
}

interface Props {
  schedule: GroupSchedule
}

export function Today({ schedule }: Props) {
  const now = useNow()
  const day = schedule.days[now.date]
  const lessons = day && !day.off ? day.lessons : []
  const highlight = pickHighlight(lessons, now)

  // Есть ли вообще данные на сегодня? Даты в JSON отсортированы.
  const dates = Object.keys(schedule.days)
  const covered = dates.length > 0 && dates[0] <= now.date && now.date <= dates[dates.length - 1]

  // Пары, которые уже показаны в большом виджете, в списке ниже не повторяем.
  const shown = new Set(highlight.kind === 'current' || highlight.kind === 'next' ? highlight.lessons : [])
  const rest = lessons.filter((l) => !shown.has(l))

  return (
    <main className="screen">
      <header className="today-header">
        <p className="today-date">{formatLongDate(now.date)}</p>
        <h1 className="screen-title">Группа {schedule.code}</h1>
      </header>

      {highlight.kind === 'current' && (
        <section aria-label="Текущая пара">
          <p className="hero-caption">
            <span className="live-dot" aria-hidden="true" />
            Сейчас идёт · до конца {formatDuration(highlight.minutesLeft)}
          </p>
          {highlight.lessons.map((l) => (
            <LessonCard key={l.raw + l.start} lesson={l} variant="hero" progress={highlight.progress} />
          ))}
        </section>
      )}

      {highlight.kind === 'next' && (
        <section aria-label="Следующая пара">
          <p className="hero-caption">Следующая пара через {formatDuration(highlight.minutesUntil)}</p>
          {highlight.lessons.map((l) => (
            <LessonCard key={l.raw + l.start} lesson={l} variant="hero" />
          ))}
        </section>
      )}

      {highlight.kind === 'finished' && (
        <div className="empty-card">
          <p className="empty-title">Пары на сегодня закончились</p>
          <p className="muted">Отдыхай! Расписание на завтра — во вкладке «Неделя».</p>
        </div>
      )}

      {highlight.kind === 'none' && (
        <div className="empty-card">
          {day?.note ? (
            <>
              <p className="empty-title">{day.note}</p>
              <p className="muted">Пар по расписанию нет.</p>
            </>
          ) : covered || day ? (
            <>
              <p className="empty-title">Сегодня пар нет</p>
              <p className="muted">{day?.off ? 'Выходной по расписанию.' : 'Можно выдохнуть.'}</p>
            </>
          ) : (
            <>
              <p className="empty-title">Нет расписания на сегодня</p>
              <p className="muted">Университет ещё не опубликовал эту неделю, или у группы практика.</p>
            </>
          )}
        </div>
      )}

      {rest.length > 0 && (
        <section className="rest">
          <h2 className="section-title">Остальные пары</h2>
          {rest.map((l) => (
            <LessonCard key={l.raw + l.start} lesson={l} variant="row" state={lessonState(l, now)} />
          ))}
        </section>
      )}
    </main>
  )
}
