# Расписание пар БГУФК — Telegram Mini App

> **Неофициальный проект.** Не связан с Белорусским государственным университетом
> физической культуры и не одобрен им. Расписание берётся из открытых PDF на
> [sportedu.by](https://www.sportedu.by/raspisanie-zanyatij/).

Пары на сегодня и на неделю для своей группы. Без регистрации и без сервера: выбранная
группа и тема хранятся только на телефоне пользователя (`localStorage`).

Статистика анонимная ([GoatCounter](https://www.goatcounter.com)): считается только число
открытий по группам, без имён и Telegram-аккаунтов. Код счётчика — в `web/src/lib/stats.ts`.

## Как это устроено

```
sportedu.by (PDF)  →  parser/ (Python)  →  web/public/data/*.json  →  web/ (React)  →  GitHub Pages  →  Telegram
```

| Папка | Что внутри | Технологии |
|---|---|---|
| `parser/` | Скачивает PDF с расписанием и превращает их в JSON | Python, pdfplumber |
| `web/` | Сам мини-апп: 3 экрана + экран начала | TypeScript, React, Vite |
| `.github/workflows/` | Робот, который раз в 3 часа обновляет расписание и публикует сайт | GitHub Actions |

## Запустить у себя

```bash
# 1. Парсер (один раз создать окружение)
python3 -m venv .venv
.venv/bin/pip install -r parser/requirements.txt
.venv/bin/python parser/parse_schedule.py

# 2. Мини-апп
cd web
npm install
npm run dev        # откроется на http://localhost:5173
```

## Опубликовать (бесплатно)

1. Создай репозиторий на GitHub и загрузи туда проект.
2. В репозитории: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Вкладка **Actions** → «Обновить расписание и опубликовать» → **Run workflow**.
4. Через пару минут сайт будет по адресу `https://ИМЯ.github.io/РЕПОЗИТОРИЙ/`.

## Бот (`bot/`, aiogram 3)

Отвечает на `/start` приветствием, пометкой о неофициальности и кнопкой «Открыть расписание».

| Файл | Что это |
|---|---|
| `bot/botcore.py` | Тексты, ответы, настройка профиля бота (кнопка меню, описание, команды) |
| `bot/api/webhook.py` | Основной режим: вебхук на Vercel, работает круглосуточно и бесплатно |
| `bot/set_webhook.py` | Один раз подключает бота к Vercel |
| `bot/bot.py` | Запуск у себя на компьютере для проверки (polling) |

### Хостинг на Vercel (бесплатно)

1. [vercel.com](https://vercel.com) → войти через GitHub → **Add New → Project** → выбрать этот репозиторий.
2. **Root Directory:** `bot`. **Environment Variables:** `BOT_TOKEN` = токен от @BotFather. **Deploy**.
3. Подключить вебхук (токен берётся из `bot/.env`):
   ```bash
   .venv/bin/pip install -r bot/requirements.txt
   cp bot/.env.example bot/.env      # и вписать BOT_TOKEN
   .venv/bin/python bot/set_webhook.py https://<проект>.vercel.app
   ```

После каждого push в `main` Vercel обновляет бота сам.

## Известные ограничения

- Только дневная форма обучения.
- В неделю практики в PDF нет пар, поэтому приложение пишет «Нет расписания на сегодня».
- Опечатки из исходных PDF (например «МТОДИКА») сохраняются как есть.
- GitHub отключает запуск по расписанию, если в публичном репозитории 60 дней не было
  изменений. Тогда достаточно сделать любой коммит или нажать **Run workflow**.
