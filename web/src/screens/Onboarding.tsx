/*
  ЭКРАН НАЧАЛА: приветствие → факультет → группа (с поиском)

  Это "мастер" из трёх шагов. Шаг хранится в состоянии step.
  Аналогия: анкета на нескольких страницах — мы помним, на какой ты странице,
  и кнопкой "Назад" (системной, в шапке Telegram) можно вернуться.

  startAt — с какого шага начать. Новичок начинает с 'welcome',
  а если группу меняют из настроек — сразу с 'faculty'.
*/
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
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
                <GroupChip group={g} onPick={onPick} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  )
}

/* ---------------- Одна кнопка-карточка группы ---------------- */

/*
  ЗАЧЕМ ОТДЕЛЬНЫЙ КОМПОНЕНТ
  У каждой карточки теперь есть своя "память": раскрыта она или нет,
  и не обрезан ли у неё текст. Если хранить это в GroupPicker, пришлось бы
  вести список "какие из 30 карточек открыты". Проще дать каждой карточке
  свой маленький мозг. Аналогия: у каждого ящика в комоде своя ручка,
  а не одна общая ручка на весь комод.

  КАК УСТРОЕНА КАРТОЧКА
  ┌───────────────────────────┐
  │ 2311                  [⌄] │  ← номер группы + кнопка "раскрыть"
  │ Гребля академическая,     │  ← текст, максимум 2 строки…
  │ гребля на байд. и каноэ…  │
  └───────────────────────────┘
  Все карточки одной высоты: под текст всегда отведено ровно 2 строки,
  даже если у группы текста нет совсем (тогда место просто пустое).

  ПОЧЕМУ ДВЕ КНОПКИ РЯДОМ, А НЕ ОДНА ВНУТРИ ДРУГОЙ
  По правилам HTML нельзя класть <button> внутрь <button>: браузер
  не поймёт, какую из них нажали. Поэтому делаем обёртку <div>,
  а внутри две кнопки-соседки: большая (выбрать группу) и маленькая
  в углу (раскрыть текст). Маленькая лежит "поверх" большой.
*/
function GroupChip({ group, onPick }: {
  // ↑ function — объявляем функцию; GroupChip — её имя (с большой буквы,
  //   так React понимает, что это компонент, а не обычный HTML-тег).
  //   { group, onPick } — деструктуризация: из пришедшего объекта props
  //   сразу достаём два поля в две переменные.
  group: GroupInfo                 // group — данные группы: code, spec, course (тип из types.ts)
  onPick: (code: string) => void   // onPick — функция "выбрали группу"; принимает строку,
                                   //   ничего не возвращает (void = "пусто")
}) {
  const [expanded, setExpanded] = useState(false)
  // ↑ useState(false) — "ячейка памяти" компонента, начальное значение false.
  //   const [a, setA] — деструктуризация массива: React отдаёт пару
  //   [текущее значение, функция-изменялка]. expanded = раскрыт ли текст.
  //   Вызов setExpanded(true) меняет значение И заставляет карточку перерисоваться.

  const [overflowing, setOverflowing] = useState(false)
  // ↑ overflowing — "текст не влез в 2 строки". Кнопку ⌄ показываем
  //   ТОЛЬКО тогда: зачем раскрывать то, что и так видно целиком?

  const specRef = useRef<HTMLSpanElement>(null)
  // ↑ useRef — "закладка" на настоящий элемент страницы. React рисует
  //   разметку сам, а нам нужно потрогать готовый <span> и измерить его.
  //   <HTMLSpanElement> — подсказка TypeScript: закладка будет на <span>.
  //   null — пока элемент не нарисован, закладка пустая.

  /*
    ИЗМЕРЯЕМ, ВЛЕЗ ЛИ ТЕКСТ
    useLayoutEffect — как useEffect, но запускается сразу после того, как
    React расставил элементы, и ДО того, как экран показан человеку.
    Поэтому кнопка ⌄ не "мигнёт": появится сразу в правильном состоянии.

    Как понять, что текст обрезан: у элемента два размера:
      clientHeight — видимая высота (наши 2 строки, 36px);
      scrollHeight — высота, которая нужна для ВСЕГО текста.
    Если нужно больше, чем видно, значит, текст спрятан.
    Аналогия: мешок (2 строки) и вещи (весь текст). Если вещей больше,
    чем помещается в мешок, часть торчит, и нужна кнопка "достать всё".
  */
  useLayoutEffect(() => {
    const el = specRef.current          // .current — сам элемент, на который смотрит закладка
    if (!el) return                     // ! — "не". Нет элемента (у группы нет текста) → выходим
    const check = () => {               // стрелочная функция-проверка, вызовем её несколько раз
      if (expanded) return              // раскрытый текст не мерим: он и так виден весь
      setOverflowing(el.scrollHeight > el.clientHeight + 1)
      // ↑ +1 — запас на дробные пиксели: браузер иногда считает 36.4 vs 36,
      //   и без запаса кнопка появилась бы у текста, который на самом деле влез.
    }
    check()                             // проверяем сразу
    /*
      ResizeObserver — "сторож размеров": зовёт check каждый раз, когда
      карточка меняет ширину (повернули телефон, открыли на планшете).
      Текст, который влезал в узкую карточку по-другому, может перестать
      влезать, или наоборот.
    */
    const observer = new ResizeObserver(check)   // new — создать нового сторожа
    observer.observe(el)                         // observe — "следи вот за этим элементом"
    return () => observer.disconnect()
    // ↑ return из эффекта — "уборка": когда карточка исчезает с экрана,
    //   отпускаем сторожа, чтобы он не работал впустую (утечка памяти).
  }, [group.spec, expanded])
  // ↑ [ ... ] — список зависимостей: перезапустить эффект, если поменялся
  //   текст группы или состояние раскрытия.

  return (
    <div className={expanded ? 'group-card expanded' : 'group-card'}>
      {/* ↑ className — так в React пишется HTML-атрибут class
          (слово class в JavaScript уже занято под классы).
          Тернарник: раскрыта → добавляем класс expanded, по нему CSS
          снимает ограничение в 2 строки. */}

      <button
        type="button"   /* type="button" — обычная кнопка, не "отправить форму" */
        className="group-chip"
        onClick={() => { hapticSelect(); onPick(group.code) }}
        /* ↑ onClick — что сделать по нажатию: лёгкая вибрация телефона
             (hapticSelect) и сообщаем наверх "выбрали группу такую-то" */
      >
        <span className="group-code">{group.code}</span>
        {/* ↑ { } в JSX — "вставь сюда значение из JavaScript" */}

        <span className="group-spec" ref={specRef}>{group.spec}</span>
        {/* ↑ ref={specRef} — прикрепляем закладку к этому <span>, чтобы мерить его.
            Span рисуем ВСЕГДА, даже с пустым текстом, — он держит место
            под 2 строки, поэтому все карточки одной высоты. */}
      </button>

      {overflowing || expanded ? (
        // ↑ || — "или". Кнопку показываем, если текст не влез
        //   ИЛИ он уже раскрыт (иначе нечем было бы свернуть обратно).
        <button
          type="button"
          className="group-more"
          onClick={() => setExpanded(!expanded)}
          // ↑ !expanded — "наоборот": было false → станет true, и обратно.
          //   Одна кнопка работает как выключатель света.
          aria-expanded={expanded}
          // ↑ aria-* — подсказки для экранного диктора (для незрячих).
          //   aria-expanded говорит "этот блок сейчас раскрыт / свёрнут".
          aria-label={expanded ? 'Свернуть описание' : 'Показать описание полностью'}
          // ↑ у кнопки только иконка без слов, поэтому даём ей имя для диктора
        >
          <IconChevron />
        </button>
      ) : null}
      {/* ↑ null — "ничего не рисовать" */}
    </div>
  )
}
