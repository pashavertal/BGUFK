/*
  ЭКРАН «СЕГОДНЯ»
    1. Шапка: день недели и дата крупно, группа мелко.
    2. Яркий зелёный виджет: пара сейчас / следующая / «На сегодня всё».
    3. Большой виджет дня: сегодня, а если пары кончились — ближайший учебный день.
       Каждая пара в своём окошке с кнопкой заметки, между ними перемены.
       Прошедшие сегодня пары свёрнуты в «Прошедшие пары · N».
*/
import { Fragment, useState, type ReactNode } from 'react'
import { IconChevron, IconGroup, IconPin, IconToday } from '../components/Icons'
import { LessonCard } from '../components/LessonCard'
import { useNow } from '../hooks/useNow'
import { noteKey, type NoteTarget, type Notes } from '../lib/notes'
import { hapticSelect } from '../lib/telegram'
import {
  addDays, formatDuration, formatGap, formatLongDate, formatShortDate, plural, shortTime,
  toMinutes, weekdayIndex, weekdayLower, type Now,
} from '../lib/time'
import type { Day, GroupSchedule, Lesson } from '../types'

type Highlight =
  | { kind: 'current'; lessons: Lesson[] }
  | { kind: 'next'; lessons: Lesson[]; minutesUntil: number }
  | { kind: 'finished' }
  | { kind: 'none' }

function pickHighlight(lessons: Lesson[], now: Now): Highlight {
  if (lessons.length === 0) return { kind: 'none' }

  // Идут сейчас (у подгрупп может быть две пары одновременно)
  const current = lessons.filter(
    (l) => toMinutes(l.start) <= now.minutes && now.minutes < toMinutes(l.end),
  )
  if (current.length > 0) {
    return {
      kind: 'current',
      lessons: current,
    }
  }

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

/** Первый день после `after`, в котором есть пары */
function nextStudyDay(schedule: GroupSchedule, after: string): { date: string; day: Day } | null {
  const date = Object.keys(schedule.days).sort()
    .find((d) => d > after && !schedule.days[d].off && schedule.days[d].lessons.length > 0)
  return date ? { date, day: schedule.days[date] } : null
}

const bellTimes = ['08:30', '10:10', '12:05', '13:45', '15:25', '17:05', '18:50']

function LessonHighlight({ lesson, live, countdown, progress }: {
  lesson: Lesson
  live: boolean
  countdown: string
  progress?: number
}) {
  const number = bellTimes.indexOf(lesson.start) + 1
  const status = live ? 'Идёт сейчас' : countdown
  const title = lesson.subject === lesson.subject.toLocaleUpperCase('ru')
    ? lesson.subject.charAt(0) + lesson.subject.slice(1).toLocaleLowerCase('ru')
    : lesson.subject

  return (
    <Hero chip={number ? `${status} · ${number} пара` : status} live={live}
          title={lesson.subject.length > 4 ? title : lesson.subject}
          progress={progress} left={live ? countdown : undefined}>
      <div className="hero-details">
        {lesson.subgroup && <span>{lesson.subgroup} подгруппа</span>}
        {lesson.rooms.length > 0 && <span><IconPin /><b>{lesson.rooms.join(', ')}</b></span>}
        {lesson.teachers.length > 0 && <span><IconGroup /><b>{lesson.teachers.join(', ')}</b></span>}
      </div>
      <div className="hero-details"><span><IconToday />{shortTime(lesson.start)}–{shortTime(lesson.end)}</span></div>
    </Hero>
  )
}

function Hero({ chip, live, title, line, progress, left, children }: {
  children?: ReactNode
  chip: string
  live?: boolean
  title: string
  line?: ReactNode
  progress?: number
  left?: string   // подпись справа от полоски: «ещё 43 мин»
}) {
  return (
    <section className="hero" aria-label={chip}>
      <span className={live ? "hero-chip live" : "hero-chip"}>
        {live && <span className="live-dot" aria-hidden="true" />}
        {chip}
      </span>
      <h2 className="hero-title">{title}</h2>
      {children}
      {line && <p className="hero-line">{line}</p>}
      {progress !== undefined && (
        <div className="hero-progress-row">
          <div className="hero-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100}
               aria-valuenow={Math.round(progress * 100)} aria-label="Сколько пары прошло">
            <div style={{ width: `${progress * 100}%` }} />
          </div>
          {left && <span className="hero-left">{left}</span>}
        </div>
      )}
    </section>
  )
}

/* ---------- Большой виджет дня ---------- */

function Break({ from, to, now }: { from: string; to: string; now?: Now }) {
  const gap = toMinutes(to) - toMinutes(from)
  if (gap <= 0) return null   // пары подгрупп в одно время
  const active = now !== undefined && toMinutes(from) <= now.minutes && now.minutes < toMinutes(to)
  const label = gap >= 60 ? 'окно' : 'перемена'
  return (
    <div className={active ? 'break active' : 'break'}>
      <span>
        {label} {active ? `· ещё ${formatGap(toMinutes(to) - now!.minutes)}` : formatGap(gap)}
      </span>
    </div>
  )
}

interface NotesProps {
  notes: Notes
  onNote: (target: NoteTarget) => void
}

/** Пары списком: окошки и перемены между ними */
function LessonList({ date, lessons, now, notes, onNote }: {
  date: string
  lessons: Lesson[]
  now?: Now
} & NotesProps) {
  return (
    <>
      {lessons.map((l, i) => (
        <Fragment key={l.raw + l.start}>
          {i > 0 && <Break from={lessons[i - 1].end} to={l.start} now={now} />}
          <LessonCard
            lesson={l}
            variant="box"
            state={now ? lessonState(l, now) : 'upcoming'}
            hasNote={Boolean(notes[noteKey({ date, lesson: l })])}
            onNote={() => onNote({ date, lesson: l })}
          />
        </Fragment>
      ))}
    </>
  )
}

/** Кнопка «Прошедшие пары · N» со стрелкой — раскрывает/сворачивает */
function PastToggle({ count, open, onToggle }: { count: number; open: boolean; onToggle: () => void }) {
  return (
    <button type="button" className={open ? 'past-toggle open' : 'past-toggle'}
            aria-expanded={open} onClick={() => { hapticSelect(); onToggle() }}>
      <span>Прошедшие пары · {count}</span>
      <IconChevron />
    </button>
  )
}

function DayCard({ title, date, lessons, now, notes, onNote }: {
  title: string
  date: string
  lessons: Lesson[]
  now?: Now   // только для сегодняшнего дня: прошедшие пары сворачиваются
} & NotesProps) {
  const [pastOpen, setPastOpen] = useState(false)
  const past = now ? lessons.filter((l) => lessonState(l, now) === 'past') : []
  const rest = lessons.filter((l) => !past.includes(l))
  const lastPast = past[past.length - 1]

  return (
    <section className="day-card">
      <header className="day-card-head">
        <h2>{title}</h2>
        <span>{lessons.length} {plural(lessons.length, ['пара', 'пары', 'пар'])}</span>
      </header>
      <div className="day-card-list">
        {past.length > 0 && <PastToggle count={past.length} open={pastOpen} onToggle={() => setPastOpen(!pastOpen)} />}
        {pastOpen && <LessonList date={date} lessons={past} now={now} notes={notes} onNote={onNote} />}
        {/* перемена между последней прошедшей и следующей видна всегда — она может идти прямо сейчас */}
        {lastPast && rest.length > 0 && <Break from={lastPast.end} to={rest[0].start} now={now} />}
        <LessonList date={date} lessons={rest} now={now} notes={notes} onNote={onNote} />
      </div>
    </section>
  )
}

/** После последней пары: сегодняшние пары отдельной свёрнутой карточкой */
function PastCard({ date, lessons, now, notes, onNote }: {
  date: string
  lessons: Lesson[]
  now: Now
} & NotesProps) {
  const [open, setOpen] = useState(false)
  return (
    <section className="day-card past-card">
      <PastToggle count={lessons.length} open={open} onToggle={() => setOpen(!open)} />
      {open && (
        <div className="day-card-list">
          <LessonList date={date} lessons={lessons} now={now} notes={notes} onNote={onNote} />
        </div>
      )}
    </section>
  )
}

/* ---------- Экран ---------- */

export function Today({ schedule, notes, onNote }: { schedule: GroupSchedule } & NotesProps) {
  const now = useNow()
  const day = schedule.days[now.date]
  const lessons = day && !day.off ? day.lessons : []
  const highlight = pickHighlight(lessons, now)
  const next = nextStudyDay(schedule, now.date)
  const tomorrow = addDays(now.date, 1)

  const dates = Object.keys(schedule.days)
  const covered = dates.length > 0 && dates[0] <= now.date && now.date <= dates[dates.length - 1]

  // «Дальше: завтра, 10:10 · Предмет · ауд.»
  const nextLine = next && (() => {
    const first = next.day.lessons[0]
    const when = next.date === tomorrow ? 'завтра' : formatShortDate(next.date)
    return (
      <>Дальше: <b>{when}, {shortTime(first.start)}</b> · {first.subject}
        {first.rooms.length > 0 && ` · ${first.rooms.join(', ')}`}</>
    )
  })()

  let hero: ReactNode
  if (highlight.kind === 'current' || highlight.kind === 'next') {
    hero = highlight.lessons.map((lesson, i) => {
      const remaining = toMinutes(lesson.end) - now.minutes
      const duration = toMinutes(lesson.end) - toMinutes(lesson.start)
      const live = highlight.kind === 'current'
      return <LessonHighlight key={lesson.raw + i} lesson={lesson} live={live}
               countdown={live ? `ещё ${formatGap(remaining)}` : `Через ${formatDuration(highlight.minutesUntil)}`}
               progress={live ? 1 - remaining / duration : undefined} />
    })
  } else if (highlight.kind === 'finished') {
    hero = <Hero chip="Пары закончились" title="На сегодня всё" line={nextLine} />
  } else if (day?.note) {
    hero = <Hero chip="Пар нет" title={day.note} line={nextLine} />
  } else if (covered || day) {
    hero = <Hero chip={day?.off ? 'Выходной' : 'Пар нет'} title="Сегодня можно выдохнуть" line={nextLine} />
  } else if (weekdayIndex(now.date) === 6) {
    // Воскресенье: выходной, даже если новую неделю ещё не выложили
    hero = <Hero chip="Выходной" title="Сегодня можно выдохнуть"
                 line={nextLine ?? 'Расписание на новую неделю ещё не опубликовано.'} />
  } else {
    hero = <Hero chip="Нет данных" title="Расписания на сегодня нет"
                 line={nextLine ?? 'Университет ещё не опубликовал эту неделю.'} />
  }

  // Пока сегодня есть пары — показываем сегодняшний день, потом ближайший учебный
  const showToday = highlight.kind === 'current' || highlight.kind === 'next'

  return (
    <main className="screen">
      <header className="today-header">
        <h1 className="screen-title">{formatLongDate(now.date)}</h1>
        <p className="today-group">Группа {schedule.code}</p>
      </header>

      {hero}

      {showToday && (
        <DayCard title={`Сегодня · ${weekdayLower(now.date)}`} date={now.date} lessons={lessons} now={now}
                 notes={notes} onNote={onNote} />
      )}
      {!showToday && next && (
        <DayCard
          title={next.date === tomorrow ? `Завтра · ${weekdayLower(next.date)}` : formatLongDate(next.date)}
          date={next.date}
          lessons={next.day.lessons}
          notes={notes}
          onNote={onNote}
        />
      )}
      {highlight.kind === 'finished' && (
        <PastCard date={now.date} lessons={lessons} now={now} notes={notes} onNote={onNote} />
      )}
    </main>
  )
}
