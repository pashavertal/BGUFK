"""
Подключить бота к Vercel (запустить один раз после первого деплоя).

  .venv/bin/python bot/set_webhook.py https://<проект>.vercel.app

Что делает:
  1. Говорит Telegram: «присылай сообщения боту на <адрес>/api/webhook»
     и передаёт секрет, по которому вебхук узнаёт настоящие запросы.
  2. Ставит кнопку меню, описание и команды бота.
Токен берётся из bot/.env.
"""
from __future__ import annotations

import asyncio
import sys

from app import make_bot, read_token, setup_bot_profile, webhook_secret


async def main(base_url: str) -> None:
    token = read_token()
    bot = make_bot(token)
    try:
        url = base_url.rstrip("/") + "/api/webhook"
        await bot.set_webhook(
            url,
            secret_token=webhook_secret(token),
            allowed_updates=["message"],
            drop_pending_updates=True,
        )
        await setup_bot_profile(bot)
        me = await bot.get_me()
        info = await bot.get_webhook_info()
        print(f"Готово: @{me.username} теперь работает через {info.url}")
        if info.last_error_message:
            print(f"Последняя ошибка Telegram: {info.last_error_message}")
    finally:
        await bot.session.close()


if __name__ == "__main__":
    if len(sys.argv) != 2 or not sys.argv[1].startswith("https://"):
        raise SystemExit("Укажи адрес проекта Vercel: python bot/set_webhook.py https://<проект>.vercel.app")
    try:
        asyncio.run(main(sys.argv[1]))
    except RuntimeError as error:
        raise SystemExit(str(error))
