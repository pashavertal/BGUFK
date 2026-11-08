/*
  ЗАГРУЗКА ДАННЫХ

  Откуда: файлы JSON, которые Python-парсер положил в web/public/data/.
  При сборке они попадают на тот же сайт, что и мини-апп (GitHub Pages).
  То есть мы скачиваем данные "из соседней комнаты" — без чужих серверов.

  import.meta.env.BASE_URL — Vite подставляет сюда базовый путь сайта
  (у нас './', см. vite.config.ts). Так ссылки работают при любом адресе.
*/
import type { GroupSchedule, ScheduleIndex } from '../types'
// "import type" — импортируем ТОЛЬКО описание типа. В итоговый JS оно не попадёт.

const DATA_URL = `${import.meta.env.BASE_URL}data`

/**
  Скачать JSON по адресу.
  async/await — способ писать "подожди ответа из интернета" так же просто,
  как обычный код. Аналогия: ты заказал пиццу (fetch) и ждёшь (await),
  а не стоишь у двери, блокируя всю квартиру — остальной интерфейс живёт.

  cache: 'no-cache' — каждый раз спросить сервер "не изменился ли файл?".
  Иначе браузер мог бы показать вчерашнее расписание из своего кеша.
*/
async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${DATA_URL}/${path}`, { cache: 'no-cache' })
  if (!response.ok) {
    // throw = "бросить ошибку". Её поймает тот, кто вызвал функцию (try/catch).
    throw new Error(`Не удалось загрузить ${path}: ${response.status}`)
  }
  return (await response.json()) as T
}

/** Оглавление: факультеты и группы */
export function fetchIndex(): Promise<ScheduleIndex> {
  return getJson<ScheduleIndex>('index.json')
}

/** Расписание одной группы */
export function fetchGroup(code: string): Promise<GroupSchedule> {
  // encodeURIComponent — на всякий случай "экранируем" спецсимволы в адресе.
  return getJson<GroupSchedule>(`groups/${encodeURIComponent(code)}.json`)
}
