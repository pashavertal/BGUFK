/*
  ХУК useNow — "живые часы"

  Экран "Сегодня" должен сам переключиться, когда пара закончилась,
  без перезагрузки. Для этого раз в 30 секунд обновляем "сейчас",
  и React перерисовывает экран.

  Почему 30 секунд, а не каждую секунду: точность до минуты нам хватает
  (время пар указано в минутах), а частые обновления зря тратят батарейку.
  30 сек — значит, опоздаем максимум на полминуты.
*/
import { useEffect, useState } from 'react'
import { minskNow, type Now } from '../lib/time'

const TICK_MS = 30_000   // 30 000 миллисекунд = 30 секунд (_ просто для читаемости)

export function useNow(): Now {
  const [now, setNow] = useState(minskNow)

  useEffect(() => {
    // setInterval — "выполняй каждые N миллисекунд"
    const id = window.setInterval(() => setNow(minskNow()), TICK_MS)

    // Когда телефон "просыпается" (вернулся в приложение) — обновить сразу,
    // а не ждать до 30 секунд.
    const onVisible = () => {
      if (document.visibilityState === 'visible') setNow(minskNow())
    }
    document.addEventListener('visibilitychange', onVisible)

    // Уборка: остановить таймер, иначе он тикал бы вечно даже после ухода с экрана.
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])   // [] — пустой список зависимостей = запустить один раз

  return now
}
