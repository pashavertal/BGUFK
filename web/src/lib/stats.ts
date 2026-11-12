/*
  АНОНИМНАЯ СТАТИСТИКА (GoatCounter)

  Что отправляем: один "просмотр" при каждом открытии приложения —
  путь /group/1101 и подпись "СПФ СИиЕ · 1 курс". Больше ничего:
  ни имени, ни Telegram-аккаунта, ни номера телефона.

  GoatCounter не ставит cookies и не хранит IP-адреса. Уникальных
  посетителей он считает по временному отпечатку, который сам сбрасывает
  каждые сутки. В его панели видно: сколько открытий и людей за день,
  неделю, месяц, и разбивку по группам — это и нужно для отчёта.

  Пока GOATCOUNTER_CODE пустой, ничего никуда не отправляется.
*/

/** Код сайта из goatcounter.com, например 'bsufk' для bsufk.goatcounter.com */
const GOATCOUNTER_CODE = 'pavelvert'

/** Записать одно открытие приложения для группы. */
export function trackOpen(code: string, faculty: string, course: number | null): void {
  if (!GOATCOUNTER_CODE) return
  // При разработке на своём компьютере статистику не портим.
  // (и с телефона по адресу 192.168.… тоже — это тот же сервер разработки)
  if (import.meta.env.DEV) return

  const params = new URLSearchParams({
    p: `/group/${code}`,
    t: course ? `${faculty} · ${course} курс` : faculty,
    r: 'telegram',
    rnd: Math.random().toString(36).slice(2),   // чтобы запрос не взялся из кеша
  })
  const url = `https://${GOATCOUNTER_CODE}.goatcounter.com/count?${params}`
  try {
    // sendBeacon уходит, даже если пользователь сразу закрыл приложение.
    if (!navigator.sendBeacon?.(url)) new Image().src = url
  } catch {
    // Статистика никогда не должна ломать приложение.
  }
}
