/*
  ЗАМЕТКИ К ПАРАМ — хранятся только на телефоне (localStorage), никуда не отправляются.
  Заметка привязана к конкретной паре в конкретный день:
  ключ = "дата|начало|предмет|подгруппа".
*/
import { addDays } from './time'
import type { GroupSchedule, Lesson } from '../types'

export type Notes = Record<string, string>

/** Пара в конкретный день — к ней и пишется заметка */
export interface NoteTarget {
  date: string
  lesson: Lesson
}

export function noteKey({ date, lesson }: NoteTarget): string {
  return `${date}|${lesson.start}|${lesson.subject}|${lesson.subgroup ?? ''}`
}

/** Следующая такая же пара (тот же предмет и подгруппа) из загруженного расписания */
export function nextOccurrence(schedule: GroupSchedule, target: NoteTarget): NoteTarget | null {
  const { date, lesson } = target
  for (const d of Object.keys(schedule.days).sort()) {
    if (d < date) continue
    const day = schedule.days[d]
    if (day.off) continue
    const match = day.lessons.find((l) =>
      l.subject === lesson.subject &&
      l.subgroup === lesson.subgroup &&
      (d > date || l.start > lesson.start))
    if (match) return { date: d, lesson: match }
  }
  return null
}

/** Убрать заметки старше 60 дней, чтобы хранилище не копилось вечно */
export function pruneOld(notes: Notes, today: string): Notes {
  const border = addDays(today, -60)
  return Object.fromEntries(Object.entries(notes).filter(([key]) => key.slice(0, 10) >= border))
}
