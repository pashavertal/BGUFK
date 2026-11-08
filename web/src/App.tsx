/*
  APP — ГЛАВНЫЙ КОМПОНЕНТ, "дирижёр" приложения

  Он решает, ЧТО показать:
    - группы нет (первый запуск) → экран начала (Onboarding)
    - пользователь меняет группу → тот же Onboarding, но с шага "факультет"
    - иначе → один из трёх экранов + нижнее меню

  Здесь же живут "глобальные" настройки: группа и тема. Их меняют
  дочерние экраны через функции-колбэки (onDone, onThemeChange).
  Аналогия: App — родитель, который хранит ключи от квартиры (состояние),
  а дети (экраны) просят: "мама, поменяй группу" — и мама меняет.
  Почему не Redux/Zustand и т.п.: состояния у нас всего два поля,
  обычного useState хватает с запасом. Лишние библиотеки — лишняя сложность.
*/
import { useState } from 'react'
import { BottomNav, type Tab } from './components/BottomNav'
import { useSchedule } from './hooks/useSchedule'
import { useTheme } from './hooks/useTheme'
import { KEYS, load, remove, save } from './lib/storage'
import { Onboarding } from './screens/Onboarding'
import { Settings } from './screens/Settings'
import { Today } from './screens/Today'
import { Week } from './screens/Week'
import type { ThemePreference } from './types'

export default function App() {
  const [group, setGroup] = useState<string | null>(() => load<string | null>(KEYS.group, null))
  const [theme, setTheme] = useState<ThemePreference>(() => load<ThemePreference>(KEYS.theme, 'system'))
  const [changingGroup, setChangingGroup] = useState(false)
  const [tab, setTab] = useState<Tab>('today')

  useTheme(theme)

  // Пользователь выбрал группу: запоминаем на телефоне и идём на "Сегодня".
  const chooseGroup = (code: string) => {
    if (group && group !== code) remove(KEYS.schedule(group))  // старая копия больше не нужна
    save(KEYS.group, code)
    setGroup(code)
    setChangingGroup(false)
    setTab('today')
  }

  const changeTheme = (value: ThemePreference) => {
    save(KEYS.theme, value)
    setTheme(value)
  }

  if (!group || changingGroup) {
    return (
      <Onboarding
        startAt={group ? 'faculty' : 'welcome'}
        onDone={chooseGroup}
        onCancel={group ? () => setChangingGroup(false) : undefined}
      />
    )
  }

  return <MainScreens group={group} tab={tab} onTab={setTab} theme={theme}
                      onThemeChange={changeTheme} onChangeGroup={() => setChangingGroup(true)} />
}

/*
  Вынесено в отдельный компонент из-за ПРАВИЛА ХУКОВ React:
  хуки (useSchedule) нельзя вызывать "иногда" — только всегда, в одном порядке.
  В App выше есть ранний return (Onboarding), поэтому useSchedule там
  вызывался бы не всегда. Здесь он вызывается всегда — правило соблюдено.
*/
function MainScreens({ group, tab, onTab, theme, onThemeChange, onChangeGroup }: {
  group: string
  tab: Tab
  onTab: (tab: Tab) => void
  theme: ThemePreference
  onThemeChange: (theme: ThemePreference) => void
  onChangeGroup: () => void
}) {
  const { schedule, offline, error } = useSchedule(group)

  let content
  if (tab === 'settings') {
    content = <Settings groupCode={group} schedule={schedule} theme={theme}
                        onThemeChange={onThemeChange} onChangeGroup={onChangeGroup} />
  } else if (!schedule) {
    content = (
      <main className="screen center">
        <p className="muted">
          {error ? 'Нет интернета, а сохранённой копии расписания пока нет.' : 'Загружаю расписание…'}
        </p>
      </main>
    )
  } else {
    content = tab === 'today' ? <Today schedule={schedule} /> : <Week schedule={schedule} />
  }

  return (
    <div className="app">
      {offline && schedule && (
        <div className="offline-banner" role="status">Нет сети — показываю сохранённое расписание</div>
      )}
      {content}
      <BottomNav active={tab} onChange={onTab} />
    </div>
  )
}
