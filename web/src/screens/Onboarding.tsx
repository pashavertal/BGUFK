/*
  ЭКРАН НАЧАЛА: приветствие → факультет → группа (с поиском)

  Это "мастер" из трёх шагов. Шаг хранится в состоянии step.
  Аналогия: анкета на нескольких страницах — мы помним, на какой ты странице,
  и кнопкой "Назад" (системной, в шапке Telegram) можно вернуться.

  startAt — с какого шага начать. Новичок начинает с 'welcome',
  а если группу меняют из настроек — сразу с 'faculty'.
*/
import { useEffect, useMemo, useState } from 'react'
import { fetchIndex } from '../lib/api'
import { hapticSelect, showBackButton } from '../lib/telegram'
import { plural } from '../lib/time'
import { Disclaimer } from '../components/Disclaimer'
import { IconChevron, IconSearch } from '../components/Icons'
import type { GroupInfo, ScheduleIndex } from '../types'

type Step = 'welcome' | 'faculty' | 'group'

interface Props {
  startAt: 'welcome' | 'faculty'
  onDone: (groupCode: string) => void
  onCancel?: () => void      // есть только при смене группы из настроек
}

export function Onboarding({ startAt, onDone, onCancel }: Props) {
  const [step, setStep] = useState<Step>(startAt)
  const [index, setIndex] = useState<ScheduleIndex | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [faculty, setFaculty] = useState<string | null>(null)

  // Оглавление качаем сразу, пока человек читает приветствие —
  // к моменту нажатия "Начать" список уже будет готов.
  useEffect(() => {
    fetchIndex().then(setIndex).catch(() => setLoadError(true))
  }, [])

  // Системная кнопка "Назад" Telegram: на каком шаге — туда и ведёт.
  useEffect(() => {
    if (step === 'group') return showBackButton(() => setStep('faculty'))
    if (step === 'faculty' && startAt === 'welcome') return showBackButton(() => setStep('welcome'))
    if (step === 'faculty' && onCancel) return showBackButton(onCancel)
    return undefined
  }, [step, startAt, onCancel])

  if (step === 'welcome') {
    return (
      <main className="screen welcome">
        <div className="welcome-mark" aria-hidden="true">
          {/* Не логотип БГУФК! Просто наш значок: календарь в фирменном зелёном */}
          <svg viewBox="0 0 48 48" width="56" height="56">
            <rect x="6" y="10" width="36" height="32" rx="6" fill="currentColor" opacity=".18" />
            <rect x="6" y="10" width="36" height="10" rx="5" fill="currentColor" />
            <path d="M16 6v8M32 6v8" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
            <path d="M15 30l6 6 12-12" stroke="currentColor" strokeWidth="4" fill="none"
                  strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h1 className="welcome-title">Расписание пар БГУФК</h1>
        <p className="welcome-text">
          Пары на сегодня и на неделю для твоей группы. Без регистрации,
          все настройки хранятся только на твоём телефоне.
        </p>
        <button type="button" className="button-primary" onClick={() => { hapticSelect(); setStep('faculty') }}>
          Начать
        </button>
        <Disclaimer />
      </main>
    )
  }

  // Пока оглавление не пришло — показываем загрузку или ошибку.
  if (!index) {
    return (
      <main className="screen center">
        {loadError
          ? <p className="muted">Не удалось загрузить список групп. Проверь интернет и открой приложение снова.</p>
          : <p className="muted">Загружаю список групп…</p>}
      </main>
    )
  }

  if (step === 'faculty') {
    return (
      <main className="screen">
        <h1 className="screen-title">Выбери факультет</h1>
        <ul className="list">
          {index.faculties.map((f) => (
            <li key={f.name}>
              <button type="button" className="list-item" onClick={() => {
                hapticSelect()
                setFaculty(f.name)
                setStep('group')
              }}>
                <span className="list-item-main">{f.name}</span>
                <span className="list-item-meta">
                  {f.groups.length} {plural(f.groups.length, ['группа', 'группы', 'групп'])}
                </span>
                <IconChevron />
              </button>
            </li>
          ))}
        </ul>
      </main>
    )
  }

  const groups = index.faculties.find((f) => f.name === faculty)?.groups ?? []
  return <GroupPicker faculty={faculty ?? ''} groups={groups} onPick={onDone} />
}

/* ---------------- Выбор группы с поиском ---------------- */

function GroupPicker({ faculty, groups, onPick }: {
  faculty: string
  groups: GroupInfo[]
  onPick: (code: string) => void
}) {
  const [query, setQuery] = useState('')

  /*
    useMemo — "запомни результат вычисления, пока не изменились входные данные".
    Фильтровать список при каждой перерисовке не страшно (групп ~30),
    но это хорошая привычка: пересчитываем только когда меняется query/groups.
  */
  const byCourse = useMemo(() => {
    const q = query.trim().toLowerCase()
    const filtered = groups.filter((g) =>
      !q || g.code.includes(q) || g.spec.toLowerCase().includes(q),
    )
    // Группируем по курсам: { 1: [...], 2: [...] }
    const map = new Map<string, GroupInfo[]>()
    for (const g of filtered) {
      const key = g.course ? `${g.course} курс` : 'Другие'
      map.set(key, [...(map.get(key) ?? []), g])
    }
    return [...map.entries()]
  }, [query, groups])

  return (
    <main className="screen">
      <h1 className="screen-title">Выбери группу</h1>
      <p className="screen-subtitle">{faculty}</p>

      <label className="search">
        <IconSearch />
        <input
          type="search"
          inputMode="numeric"   /* на телефоне сразу откроется цифровая клавиатура */
          placeholder="Номер группы, например 1101"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Поиск группы"
        />
      </label>

      {byCourse.length === 0 && <p className="muted center-text">Ничего не нашлось</p>}

      {byCourse.map(([course, list]) => (
        <section key={course}>
          <h2 className="section-title">{course}</h2>
          <ul className="group-grid">
            {list.map((g) => (
              <li key={g.code}>
                <button type="button" className="group-chip" onClick={() => { hapticSelect(); onPick(g.code) }}>
                  <span className="group-code">{g.code}</span>
                  {g.spec && <span className="group-spec">{g.spec}</span>}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  )
}
