"""
Запуск бота у себя на компьютере (режим polling) — для проверки изменений.

Основной режим — вебхук на Vercel (bot/api/webhook.py). Telegram не даёт
работать обоими способами сразу, поэтому, если вебхук уже подключён,
этот скрипт не запустится, чтобы случайно не отключить бота на Vercel.
Принудительно (вебхук будет снят!):  .venv/bin/python bot/bot.py --force
Вернуть вебхук потом:                .venv/bin/python bot/set_webhook.py <адрес>

Запуск:  .venv/bin/python bot/bot.py   (токен берётся из bot/.env)
"""
from __future__ import annotations

import asyncio
import logging
import sys

from app import dp, make_bot, read_token, setup_bot_profile


async def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    bot = make_bot(read_token())
    info = await bot.get_webhook_info()
    if info.url and "--force" not in sys.argv:
        await bot.session.close()
        raise SystemExit(
            f"Бот уже работает через вебхук ({info.url}).\n"
            "Локальный запуск отключил бы его. Если это и нужно — добавь --force."
        )
    await setup_bot_profile(bot)
    me = await bot.get_me()
    logging.info("Бот @%s запущен. Остановить: Ctrl+C", me.username)
    # Старые сообщения, пришедшие, пока бот был выключен, пропускаем,
    # чтобы человек не получил пачку приветствий разом.
    await bot.delete_webhook(drop_pending_updates=True)
    await dp.start_polling(bot)


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except RuntimeError as error:
        raise SystemExit(str(error))
