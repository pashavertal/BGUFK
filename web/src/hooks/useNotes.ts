/*
  ХУК useNotes — заметки группы: читаем с телефона, меняем и сразу сохраняем обратно.
*/
import { useState } from 'react'
import { minskNow } from '../lib/time'
import { pruneOld, type Notes } from '../lib/notes'
import { KEYS, load, save } from '../lib/storage'

export interface NotesApi {
  notes: Notes
  /** Изменить сразу несколько заметок: { ключ: текст }, пустой текст = удалить */
  updateNotes: (changes: Notes) => void
}

export function useNotes(group: string): NotesApi {
  const [notes, setNotes] = useState<Notes>(() =>
    pruneOld(load<Notes>(KEYS.notes(group), {}), minskNow().date))

  const updateNotes = (changes: Notes) => {
    const next = { ...notes }
    for (const [key, text] of Object.entries(changes)) {
      const clean = text.trim()
      if (clean) next[key] = clean
      else delete next[key]
    }
    save(KEYS.notes(group), next)
    setNotes(next)
  }

  return { notes, updateNotes }
}
