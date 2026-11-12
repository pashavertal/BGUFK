/*
  ОКНО ЗАМЕТКИ — по центру экрана, всё позади размыто.
  Сверху «Новая заметка» (или «Изменить заметку»), к какой паре, поле ввода,
  ниже выбор: эта пара или следующая такая же. Внизу «Отменить» и «Сохранить».
*/
import { useEffect, useRef, useState } from 'react'
import { nextOccurrence, noteKey, type NoteTarget, type Notes } from '../lib/notes'
import { hapticSelect, showBackButton } from '../lib/telegram'
import { formatShortDate, shortTime, WEEKDAY_SHORT, weekdayIndex } from '../lib/time'
import type { GroupSchedule } from '../types'
import { IconCheck, IconTrash } from './Icons'

/** "чт, 12 ноября, 8:30" */
function when({ date, lesson }: NoteTarget): string {
  return `${WEEKDAY_SHORT[weekdayIndex(date)].toLowerCase()}, ${formatShortDate(date)}, ${shortTime(lesson.start)}`
}

interface Props {
  schedule: GroupSchedule
  target: NoteTarget
  notes: Notes
  onSave: (changes: Notes) => void
  onClose: () => void
}

export function NoteSheet({ schedule, target, notes, onSave, onClose }: Props) {
  const key = noteKey(target)
  const existing = notes[key] ?? ''
  const editing = existing !== ''
  const next = nextOccurrence(schedule, target)

  const [text, setText] = useState(existing)
  const [toNext, setToNext] = useState(false)
  const backdrop = useRef<HTMLDivElement>(null)

  // Системная «Назад» в Telegram и Esc на компьютере закрывают окно
  useEffect(() => showBackButton(onClose), [onClose])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // Когда открыта клавиатура, видимая часть экрана меньше — держим окно в её центре
  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const fit = () => {
      if (!backdrop.current) return
      backdrop.current.style.height = `${vv.height}px`
      backdrop.current.style.top = `${vv.offsetTop}px`
    }
    fit()
    vv.addEventListener('resize', fit)
    vv.addEventListener('scroll', fit)
    return () => {
      vv.removeEventListener('resize', fit)
      vv.removeEventListener('scroll', fit)
    }
  }, [])

  const save = () => {
    const dest = toNext && next ? noteKey(next) : key
    if (dest === key) {
      onSave({ [key]: text })
    } else {
      // Переносим к следующей паре; если там уже есть заметка — дописываем
      const there = notes[dest]
      onSave({ [key]: '', [dest]: there ? `${there}\n${text}` : text })
    }
    onClose()
  }

  const choose = (value: boolean) => { hapticSelect(); setToNext(value) }

  return (
    <div className="sheet-backdrop" ref={backdrop}
         onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-title">
        <div className="sheet-head">
          <h2 id="sheet-title">{editing ? 'Изменить заметку' : 'Новая заметка'}</h2>
          {editing && (
            <button type="button" className="sheet-delete" aria-label="Удалить заметку"
                    onClick={() => { onSave({ [key]: '' }); onClose() }}>
              <IconTrash />
            </button>
          )}
        </div>
        <p className="sheet-lesson">
          К паре: <b>{target.lesson.subject}</b>
          <small>{when(target)}</small>
        </p>

        <textarea
          className="sheet-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Например: взять форму и кроссовки"
          rows={4}
          maxLength={1000}
          autoFocus={!editing}
        />

        {next && (
          <div className="sheet-options" role="radiogroup" aria-label="К какой паре">
            <button type="button" role="radio" aria-checked={!toNext}
                    className={!toNext ? 'sheet-option active' : 'sheet-option'} onClick={() => choose(false)}>
              <span><b>Эта пара</b><small>{when(target)}</small></span>
              {!toNext && <IconCheck />}
            </button>
            <button type="button" role="radio" aria-checked={toNext}
                    className={toNext ? 'sheet-option active' : 'sheet-option'} onClick={() => choose(true)}>
              <span><b>Следующая такая же</b><small>{when(next)}</small></span>
              {toNext && <IconCheck />}
            </button>
          </div>
        )}

        <div className="sheet-buttons">
          <button type="button" className="sheet-cancel" onClick={onClose}>Отменить</button>
          <button type="button" className="sheet-save" onClick={save}
                  disabled={!editing && text.trim() === ''}>
            Сохранить
          </button>
        </div>
      </div>
    </div>
  )
}
