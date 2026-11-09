/*
  ЭКРАН 2: ПАРЫ НА НЕДЕЛЮ

  Дни идут столбиком. Слева — число и короткий день недели ("8" / "Вс"),
  справа — пары. Сегодняшний день подсвечен зелёным.

  Бонус к ТЗ: на сайте обычно выложены 2 недели (текущая и следующая),
  поэтому есть переключатель "Эта неделя / Следующая".
*/
import { useEffect, useRef, useState } from 'react'
import { LessonCard } from '../components/LessonCard'
import { useNow } from '../hooks/useNow'
import { addDays, dayOfMonth, formatShortDate, mondayOf, WEEKDAY_SHORT, weekdayIndex } from '../lib/time'
import { hapticSelect } from '../lib/telegram'
import type { GroupSchedule } from '../types'

interface Props {
  schedule: GroupSchedule
}

export function Week({ schedule }: Props) {
  const now = useNow()
  const thisMonday = mondayOf(now.date)
  const nextMonday = addDays(thisMonday, 7)

  // Есть ли в данных хоть один день следующей недели?
  const hasNext = Object.keys(schedule.days).some((d) => d >= nextMonday && d < addDays(nextMonday, 7))
  // В воскресенье текущая неделя уже прошла — сразу показываем следующую.
  const [weekStart, setWeekStart] = useState(
    () => (weekdayIndex(now.date) === 6 && hasNext ? nextMonday : thisMonday),
  )

  // useRef — "закладка" на настоящий HTML-элемент, чтобы прокрутить к нему.
  const todayRef = useRef<HTMLElement>(null)
  useEffect(() => {
    // block: 'center' — поставить сегодняшний день в середину экрана
    todayRef.current?.scrollIntoView({ block: 'center' })
  }, [weekStart])

  // 7 дат недели: пн..вс. Воскресенье показываем, только если в нём есть пары.
  const dates = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
    .filter((d, i) => i < 6 || (schedule.days[d]?.lessons.length ?? 0) > 0)

  return (
    <main className="screen">
      <h1 className="screen-title">Неделя</h1>
      <p className="screen-subtitle">
        {formatShortDate(weekStart)} — {formatShortDate(addDays(weekStart, 5))}
      </p>

      {hasNext && (
        <div className="segmented" role="tablist" aria-label="Выбор недели">
          {[
            { start: thisMonday, label: 'Эта неделя' },
            { start: nextMonday, label: 'Следующая' },
          ].map(({ start, label }) => (
            <button key={start} type="button" role="tab" aria-selected={weekStart === start}
                    className={weekStart === start ? 'segment active' : 'segment'}
                    onClick={() => { hapticSelect(); setWeekStart(start) }}>
              {label}
            </button>
          ))}
        </div>
      )}

      <div className="week-list">
        {dates.map((date) => {
          const day = schedule.days[date]
          const isToday = date === now.date
          return (
            <section
              key={date}
              ref={isToday ? todayRef : undefined}
              className={isToday ? 'week-day today' : 'week-day'}
              aria-label={isToday ? 'Сегодня' : undefined}
            >
              <div className="week-date">
                <span className="week-date-num">{dayOfMonth(date)}</span>
                <span className="week-date-wd">{WEEKDAY_SHORT[weekdayIndex(date)]}</span>
              </div>
              <div className="week-lessons">
                {!day && <p className="muted small">Нет данных</p>}
                {day?.off && <p className="muted small">Выходной</p>}
                {day?.note && day.lessons.length === 0 && <p className="week-note">{day.note}</p>}
                {day && !day.off && !day.note && day.lessons.length === 0 && <p className="muted small">Пар нет</p>}
                {day && !day.off && day.lessons.map((l) => (
                  <LessonCard key={l.raw + l.start} lesson={l} variant="row" />
                ))}
              </div>
            </section>
          )
        })}
      </div>
    </main>
  )
}
