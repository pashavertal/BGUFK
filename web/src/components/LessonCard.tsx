/*
  КАРТОЧКА ПАРЫ

  Один компонент — два вида (variant):
    'hero' — большой виджет "пара сейчас" на экране "Сегодня": жирно,
             время слева, преподаватель и аудитория, полоска прогресса.
    'row'  — обычная строка в списке: компактно, не так жирно.

  Props ("свойства") — это входные данные компонента, как аргументы функции.
  Аналогия: компонент — формочка для печенья, props — тесто и посыпка.
  Формочка одна, а печенье разное.
*/
import type { Lesson } from '../types'

/** "08:30" -> "8:30" (как в ТЗ: 8:30-9:55) */
function shortTime(hhmm: string): string {
  return hhmm.replace(/^0/, '')   // убрать ведущий ноль регулярным выражением
}

/** Собрать "кто ведёт · где" в одну строку для компактного вида */
function details(lesson: Lesson): string {
  return [lesson.teachers.join(', '), lesson.rooms.join(', ')].filter(Boolean).join(' · ')
}

interface Props {
  lesson: Lesson
  variant: 'hero' | 'row'
  state?: 'past' | 'current' | 'upcoming'
  progress?: number   // 0..1 — сколько пары прошло (только для hero)
}

export function LessonCard({ lesson, variant, state = 'upcoming', progress }: Props) {
  // Дополнительные пометки: "лекция", "подгруппа 2", "с 09.11"
  const tags = [
    lesson.type,
    lesson.subgroup ? `${lesson.subgroup} подгр.` : null,
    ...lesson.notes,
  ].filter((tag): tag is string => Boolean(tag))
  // (tag): tag is string — "охранник типа": обещаем TypeScript, что после
  // фильтра в массиве останутся только строки, без null.

  if (variant === 'hero') {
    return (
      <article className="hero-card">
        <div className="hero-time">
          <span>{shortTime(lesson.start)}</span>
          <span className="hero-time-end">{shortTime(lesson.end)}</span>
        </div>
        <div className="hero-body">
          <h2 className="hero-subject">{lesson.subject}</h2>
          {tags.length > 0 && (
            <div className="tags">
              {tags.map((tag) => <span key={tag} className="tag tag-on-green">{tag}</span>)}
            </div>
          )}
          {/* && — "нарисуй, только если условие истинно" */}
          {lesson.teachers.length > 0 && (
            <p className="hero-line"><span className="hero-label">Преподаватель</span>{lesson.teachers.join(', ')}</p>
          )}
          {lesson.rooms.length > 0 && (
            <p className="hero-line"><span className="hero-label">Аудитория</span>{lesson.rooms.join(', ')}</p>
          )}
        </div>
        {progress !== undefined && (
          // role="progressbar" + aria-* — чтобы экранный диктор озвучил прогресс
          <div className="hero-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100}
               aria-valuenow={Math.round(progress * 100)} aria-label="Сколько пары прошло">
            <div style={{ width: `${progress * 100}%` }} />
          </div>
        )}
      </article>
    )
  }

  return (
    <article className={`lesson-row lesson-${state}`}>
      <div className="lesson-time">
        <span>{shortTime(lesson.start)}</span>
        <span className="lesson-time-end">{shortTime(lesson.end)}</span>
      </div>
      <div className="lesson-body">
        <h3 className="lesson-subject">{lesson.subject}</h3>
        {details(lesson) && <p className="lesson-details">{details(lesson)}</p>}
        {tags.length > 0 && (
          <div className="tags">
            {tags.map((tag) => <span key={tag} className="tag">{tag}</span>)}
          </div>
        )}
      </div>
    </article>
  )
}
