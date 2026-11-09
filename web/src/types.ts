/*
  ТИПЫ ДАННЫХ — "чертежи" того, как выглядят наши данные.

  Это главная фишка TypeScript. Аналогия: форма для льда в морозилке.
  Если сказать "пара — это объект с полями subject, start, end...",
  то TypeScript будет бить по рукам, когда ты:
    - опечатаешься: lesson.subjet (нет такого поля!)
    - забудешь, что поле может быть пустым (type: string | null)
  И всё это ДО запуска, прямо в редакторе — красным подчёркиванием.

  Эти типы повторяют то, что пишет Python-парсер в JSON.
  Если поменяешь формат в парсере — поменяй и здесь.
*/

/** Одна пара. Пример: БИОХИМИЯ, 08:30–09:55, Ильютик, ауд. 405 */
export interface Lesson {
  start: string            // "08:30" — всегда 5 символов, удобно сравнивать строки
  end: string              // "09:55"
  subject: string          // "БИОХИМИЯ"
  type: string | null      // "лекция" или null (null = "ничего не указано")
  teachers: string[]       // ["Ильютик", "Мороз"] — массив, т.к. бывает несколько
  rooms: string[]          // ["405", "409"]
  notes: string[]          // ["с 09.11"] — особые пометки из PDF
  subgroup?: number        // 1 или 2. Знак ? = поле может отсутствовать вовсе
  raw: string              // исходный текст клетки из PDF — на случай ошибок разбора
}

/** Один день: выходной ли он и список пар */
export interface Day {
  off: boolean
  lessons: Lesson[]
  note?: string   // вместо пар, например "Производственная педагогическая практика (6 недель)"
}

/** "Тетрадка" одной группы — файл data/groups/1101.json */
export interface GroupSchedule {
  code: string
  faculty: string
  spec: string
  course: number | null
  generatedAt: string                // когда парсер создал файл (ISO-время)
  days: Record<string, Day>          // Record<ключ, значение> = словарь: "2026-11-02" -> Day
}

/** Краткая информация о группе для списка выбора */
export interface GroupInfo {
  code: string
  spec: string
  course: number | null
}

/** Оглавление — файл data/index.json */
export interface ScheduleIndex {
  generatedAt: string
  source: string
  faculties: { name: string; groups: GroupInfo[] }[]
}

/**
  Тема оформления.
  Это "объединение строк": переменная может быть ТОЛЬКО одной из трёх строк.
  Написать theme = 'blue' TypeScript не даст.
*/
export type ThemePreference = 'system' | 'light' | 'dark'
