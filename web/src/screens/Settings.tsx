/*
  ЭКРАН 3: НАСТРОЙКИ — группа, тема, ссылки

  Плюс блок "О приложении" с пометкой о неофициальности и источником данных.
*/
import { useEffect, useRef, useState } from 'react'
import { Disclaimer } from '../components/Disclaimer'
import { IconChevron, IconGroup, IconMessage, IconStudy, IconTelegram } from '../components/Icons'
import { hapticSelect, openLink, openTelegramLink } from '../lib/telegram'
import { THEMES } from '../lib/themes'
import type { GroupSchedule, ThemePreference } from '../types'

/** Куда пишут об ошибках в расписании и предложения */
const FEEDBACK_URL = 'https://t.me/Runnwayy'
/** Канал проекта: новости и обновления */
const CHANNEL_URL = 'https://t.me/studentsbgufk'
/** Дистанционное обучение БГУФК */
const DISTANCE_URL = 'https://touredu.by/login/index.php'

/** Мини-превью темы: виджет сверху, карточка снизу — цвета берутся из самой темы */
function Swatch({ palette }: { palette: string }) {
  return (
    <span className="swatch" data-palette={palette} aria-hidden="true">
      <i /><b />
    </span>
  )
}

interface Props {
  groupCode: string
  schedule: GroupSchedule | null
  theme: ThemePreference
  onThemeChange: (theme: ThemePreference) => void
  onChangeGroup: () => void
}

export function Settings({ groupCode, schedule, theme, onThemeChange, onChangeGroup }: Props) {
  const [aboutOpen, setAboutOpen] = useState(false)

  // Выбранная тема может быть в конце ленты — при открытии прокручиваем к ней (только по горизонтали)
  const themeRow = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const row = themeRow.current
    const tile = row?.querySelector<HTMLElement>('.theme-tile.active')
    if (row && tile) row.scrollLeft = tile.offsetLeft - row.clientWidth / 2 + tile.offsetWidth / 2
  }, [])
  // Дата обновления данных парсером — понятным языком ("8 ноября, 22:44").
  const updated = schedule
    ? new Date(schedule.generatedAt).toLocaleString('ru-RU', {
        timeZone: 'Europe/Minsk', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
      })
    : null

  return (
    <main className="screen">
      <h1 className="screen-title">Настройки</h1>

      <div className="card widget">
        <p className="widget-title">Группа {groupCode}</p>
        {schedule && (
          <p className="muted small">
            {[schedule.faculty, schedule.spec, schedule.course && `${schedule.course} курс`]
              .filter(Boolean).join(' · ')}
          </p>
        )}
        <button type="button" className="widget-button" onClick={onChangeGroup}>
          <span className="widget-icon"><IconGroup /></span>Сменить группу
        </button>
      </div>

      <div className="card widget">
        <p className="widget-title">Оформление</p>
        <div className="theme-row" role="radiogroup" aria-label="Тема оформления" ref={themeRow}>
          {/* «Авто» — как в Telegram: половина светлой, половина тёмной */}
          {[{ id: 'system' as const, label: 'Авто' }, ...THEMES].map(({ id, label }) => (
            <button key={id} type="button" role="radio" aria-checked={theme === id}
                    className={theme === id ? 'theme-tile active' : 'theme-tile'}
                    onClick={() => { hapticSelect(); onThemeChange(id) }}>
              {id === 'system'
                ? <span className="swatch-split"><Swatch palette="light" /><Swatch palette="dark" /></span>
                : <Swatch palette={id} />}
              <span className="theme-name">{label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="card widget">
        <p className="widget-title">Дистанционное обучение БГУФК</p>
        <p className="muted small">Курсы и задания на сайте touredu.by.</p>
        <button type="button" className="widget-button" onClick={() => openLink(DISTANCE_URL)}>
          <span className="widget-icon"><IconStudy /></span>Открыть
        </button>
      </div>

      <h2 className="section-title settings-section">Новости</h2>
      <div className="card widget quiet">
        <p className="widget-title">Канал проекта</p>
        <p className="muted small">Обновления, инструкции и опросы о новых функциях.</p>
        <button type="button" className="widget-button" onClick={() => openTelegramLink(CHANNEL_URL)}>
          <span className="widget-icon telegram"><IconTelegram /></span>Наш Telegram-канал
        </button>
      </div>

      <h2 className="section-title settings-section">Обратная связь</h2>
      <div className="card widget quiet">
        <p className="widget-title">Нашёл ошибку?</p>
        <p className="muted small">Неверная пара, нет группы или есть идея — напиши, исправим.</p>
        <button type="button" className="widget-button" onClick={() => openTelegramLink(FEEDBACK_URL)}>
          <span className="widget-icon"><IconMessage /></span>Напиши нам
        </button>
      </div>

      {/* "О приложении" — свёрнуто по умолчанию, раскрывается на месте */}
      <div className={aboutOpen ? 'card about open' : 'card about'}>
        <button
          type="button"
          className="about-toggle"
          aria-expanded={aboutOpen}
          aria-controls="about-text"
          onClick={() => { hapticSelect(); setAboutOpen(!aboutOpen) }}
        >
          <span>О приложении</span>
          <IconChevron />
        </button>
        {aboutOpen && (
          <div id="about-text" className="about-text">
            <Disclaimer />
            <p className="muted small">
              Выбранная группа, тема и заметки хранятся только на этом телефоне. Мы считаем только анонимное число открытий по группам — без имён и Telegram-аккаунтов.
            </p>
            {updated && <p className="muted small">Данные обновлены: {updated}</p>}
          </div>
        )}
      </div>
    </main>
  )
}
