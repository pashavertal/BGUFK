/*
  ХУК useSchedule — "достань мне расписание группы"

  Что такое хук: функция React, имя которой начинается с use. Она может
  ПОМНИТЬ данные между перерисовками экрана (useState) и делать
  "побочные действия" вроде скачивания (useEffect).
  Аналогия: хук — это помощник, которого экран нанимает: "следи за
  расписанием и скажи мне, когда оно поменяется".

  Стратегия "сначала из шкафчика, потом из интернета"
  (по-умному: stale-while-revalidate):
    1. Сразу показываем копию из localStorage — экран открывается мгновенно,
       даже без интернета (в метро, в подвале УСК).
    2. Параллельно качаем свежий файл. Пришёл — показываем и кладём в шкафчик.
    3. Не пришёл (нет сети) — остаёмся на копии и честно пишем "офлайн".
*/
import { useEffect, useState } from 'react'
import { fetchGroup } from '../lib/api'
import { KEYS, load, save } from '../lib/storage'
import type { GroupSchedule } from '../types'

export interface ScheduleState {
  schedule: GroupSchedule | null
  loading: boolean      // идёт ли сейчас скачивание
  offline: boolean      // не смогли скачать свежее — показываем копию
  error: boolean        // нет ни свежего, ни копии
}

export function useSchedule(code: string): ScheduleState {
  // useState(начальное) возвращает [значение, функция_чтобы_поменять].
  // Функция-инициализатор () => load(...) выполнится только один раз.
  const [schedule, setSchedule] = useState<GroupSchedule | null>(
    () => load<GroupSchedule | null>(KEYS.schedule(code), null),
  )
  const [loading, setLoading] = useState(true)
  const [offline, setOffline] = useState(false)

  // useEffect(действие, [зависимости]) — "сделай это после отрисовки,
  // и повторяй каждый раз, когда поменяется что-то из списка зависимостей".
  // Здесь зависимость — code: сменил группу → качаем другую.
  useEffect(() => {
    // Флаг "экран ещё жив". Если пользователь сменил группу, пока шла
    // загрузка, старый ответ нам уже не нужен — не перетираем им новую группу.
    let alive = true
    setSchedule(load<GroupSchedule | null>(KEYS.schedule(code), null))
    setLoading(true)
    setOffline(false)

    fetchGroup(code)
      .then((fresh) => {
        if (!alive) return
        setSchedule(fresh)
        save(KEYS.schedule(code), fresh)
      })
      .catch(() => {
        if (alive) setOffline(true)
      })
      .finally(() => {
        if (alive) setLoading(false)
      })

    // Функция "уборки": React вызовет её перед следующим запуском эффекта
    // или когда экран исчезнет.
    return () => {
      alive = false
    }
  }, [code])

  return { schedule, loading, offline, error: !loading && offline && !schedule }
}
