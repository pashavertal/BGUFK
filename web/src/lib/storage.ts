/*
  ХРАНИЛИЩЕ НА ТЕЛЕФОНЕ (localStorage)

  localStorage — это маленький "шкафчик" внутри браузера/Telegram на телефоне
  пользователя. В него можно положить строку под ярлыком (ключом) и достать
  её потом, даже после закрытия приложения.

  Почему именно localStorage:
    - По ТЗ мы НИЧЕГО не собираем: данные живут только на телефоне.
      У нас нет сервера с базой данных — нам физически некуда их отправить.
    - Он есть везде и не требует разрешений.
  Почему не Telegram CloudStorage: он хранит данные на серверах Telegram
  (привязано к аккаунту). Удобно для синхронизации, но это уже "не только на
  телефоне". Для MVP — нет.

  Почему всё обёрнуто в try/catch:
  В некоторых режимах (приватный режим, переполнение, запрет сайта) шкафчик
  бывает "заперт", и обращение к нему ВЫБРАСЫВАЕТ ОШИБКУ. Без try/catch
  приложение бы просто упало белым экраном. С try/catch — работает дальше,
  просто не запоминает.
*/

// Префикс для всех ключей — чтобы наши ярлыки не перепутались с чужими.
const PREFIX = 'bsufk.'

export const KEYS = {
  group: 'group',            // выбранная группа, например "1101"
  theme: 'theme',            // 'system' | 'light' | 'dark'
  schedule: (code: string) => `schedule.${code}`,  // копия расписания группы
} as const
// as const — "заморозить": TypeScript запомнит точные значения, а не просто "строка".

/** Прочитать значение. <T> — "дженерик": функция вернёт тот тип, который попросишь. */
export function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    // JSON.parse превращает строку '"1101"' обратно в значение "1101".
    return raw === null ? fallback : (JSON.parse(raw) as T)
  } catch {
    return fallback
  }
}

/** Сохранить значение. JSON.stringify превращает любое значение в строку. */
export function save(key: string, value: unknown): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value))
  } catch {
    // Шкафчик заперт или полон — молча продолжаем без сохранения.
  }
}

/** Удалить значение. */
export function remove(key: string): void {
  try {
    localStorage.removeItem(PREFIX + key)
  } catch {
    // ничего страшного
  }
}
