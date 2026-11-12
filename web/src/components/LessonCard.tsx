/*
  КАРТОЧКА ПАРЫ
    'row' — строка внутри дня на экране «Неделя» (без своей рамки);
    'box' — отдельное окошко внутри большого виджета на «Сегодня».
  Справа кнопка заметки: жирный плюс, а если заметка есть — оранжевый документ.
*/
import { shortTime } from '../lib/time'
import type { Lesson } from '../types'
import { IconNote, IconPlus } from './Icons'

/** "кто ведёт · где" одной строкой */
function details(lesson: Lesson): string {
  return [lesson.teachers.join(', '), lesson.rooms.join(', ')].filter(Boolean).join(' · ')
}

interface Props {
  lesson: Lesson
  variant: 'row' | 'box'
  state?: 'past' | 'current' | 'upcoming'
  hasNote?: boolean
  /** Открыть заметку. В 'box' — по кнопке, в 'row' — по нажатию на всю пару */
  onNote?: () => void
}

export function LessonCard({ lesson, variant, state = 'upcoming', hasNote = false, onNote }: Props) {
  // Пометки: "лекция", "2 подгр.", "с 09.11"
  const tags = [
    lesson.type,
    lesson.subgroup ? `${lesson.subgroup} подгр.` : null,
    ...lesson.notes,
  ].filter((tag): tag is string => Boolean(tag))

  const wholeTap = variant === 'row' && onNote
  // В 'box' плюс виден всегда, в 'row' — только значок существующей заметки
  const showButton = onNote && (variant === 'box' || hasNote)

  return (
    <article
      className={`lesson-row lesson-${variant} lesson-${state}${wholeTap ? ' tappable' : ''}`}
      onClick={wholeTap ? onNote : undefined}
      role={wholeTap ? 'button' : undefined}
      tabIndex={wholeTap ? 0 : undefined}
      aria-label={wholeTap ? `${lesson.subject}, ${shortTime(lesson.start)}. Заметка` : undefined}
      onKeyDown={wholeTap ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onNote() } } : undefined}
    >
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
      {showButton && (
        <button
          type="button"
          className={hasNote ? 'note-btn has-note' : 'note-btn'}
          aria-label={hasNote ? `Заметка к паре ${lesson.subject}` : `Добавить заметку к паре ${lesson.subject}`}
          onClick={(e) => { e.stopPropagation(); onNote() }}
        >
          {hasNote ? <IconNote /> : <IconPlus />}
        </button>
      )}
    </article>
  )
}
