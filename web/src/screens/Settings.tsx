/*
  ЭКРАН 3: НАСТРОЙКИ (для MVP — группа и тема)

  Плюс блок "О приложении" с пометкой о неофициальности и источником данных.
*/
import { Disclaimer } from '../components/Disclaimer'
import { hapticSelect } from '../lib/telegram'
import type { GroupSchedule, ThemePreference } from '../types'

const THEMES: { id: ThemePreference; label: string }[] = [
  { id: 'system', label: 'Авто' },   // "Авто" = как в Telegram; коротко, чтобы влезло в одну строку
  { id: 'light', label: 'Светлая' },
  { id: 'dark', label: 'Тёмная' },
]

interface Props {
  groupCode: string
  schedule: GroupSchedule | null
  theme: ThemePreference
  onThemeChange: (theme: ThemePreference) => void
  onChangeGroup: () => void
}

export function Settings({ groupCode, schedule, theme, onThemeChange, onChangeGroup }: Props) {
  // Дата обновления данных парсером — понятным языком ("8 ноября, 22:44").
  const updated = schedule
    ? new Date(schedule.generatedAt).toLocaleString('ru-RU', {
        timeZone: 'Europe/Minsk', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
      })
    : null

  return (
    <main className="screen">
      <h1 className="screen-title">Настройки</h1>

      <h2 className="section-title">Группа</h2>
      <div className="card settings-group">
        <div>
          <p className="settings-group-code">{groupCode}</p>
          {schedule && (
            <p className="muted small">
              {[schedule.faculty, schedule.spec, schedule.course && `${schedule.course} курс`]
                .filter(Boolean).join(' · ')}
            </p>
          )}
        </div>
        <button type="button" className="button-secondary" onClick={onChangeGroup}>Сменить</button>
      </div>

      <h2 className="section-title">Тема</h2>
      <div className="segmented" role="radiogroup" aria-label="Тема оформления">
        {THEMES.map(({ id, label }) => (
          <button key={id} type="button" role="radio" aria-checked={theme === id}
                  className={theme === id ? 'segment active' : 'segment'}
                  onClick={() => { hapticSelect(); onThemeChange(id) }}>
            {label}
          </button>
        ))}
      </div>
      <p className="muted small">«Авто» — тема меняется вместе с темой Telegram.</p>

      <h2 className="section-title">О приложении</h2>
      <div className="card">
        <Disclaimer />
        <p className="muted small">
          Мы ничего не собираем: выбранная группа и тема хранятся только на этом телефоне.
        </p>
        {updated && <p className="muted small">Данные обновлены: {updated}</p>}
      </div>
    </main>
  )
}
