"""
Вебхук для Vercel: сюда Telegram присылает каждое новое сообщение боту.

Как это работает: Vercel держит адрес https://<проект>.vercel.app/api/webhook.
Когда кто-то пишет боту, Telegram отправляет на этот адрес POST-запрос с
сообщением. Vercel на долю секунды запускает этот файл, мы отвечаем
пользователю и выключаемся. Сервер не работает постоянно, поэтому это
бесплатно, и при этом бот отвечает круглосуточно.

Vercel ищет в файле класс с именем handler — так устроен его Python-рантайм.
"""
from __future__ import annotations

import asyncio
import hmac
import json
import logging
import sys
from http.server import BaseHTTPRequestHandler
from pathlib import Path

# botcore.py лежит на папку выше
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from aiogram.types import Update  # noqa: E402

from botcore import dp, make_bot, read_token, webhook_secret  # noqa: E402


async def process(token: str, data: dict) -> None:
    bot = make_bot(token)
    try:
        await dp.feed_update(bot, Update.model_validate(data, context={"bot": bot}))
    finally:
        await bot.session.close()


class handler(BaseHTTPRequestHandler):
    def _reply(self, status: int, text: str) -> None:
        body = text.encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "text/plain; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self) -> None:
        # Открыть адрес в браузере — простая проверка, что Vercel работает.
        self._reply(200, "Бот работает")

    def do_POST(self) -> None:
        try:
            token = read_token()
        except RuntimeError:
            self._reply(500, "BOT_TOKEN не задан в настройках Vercel")
            return

        # Чужие запросы (не от Telegram) отбрасываем: у них нет нашего секрета.
        got = self.headers.get("X-Telegram-Bot-Api-Secret-Token", "")
        if not hmac.compare_digest(got, webhook_secret(token)):
            self._reply(403, "forbidden")
            return

        try:
            length = int(self.headers.get("Content-Length") or 0)
            data = json.loads(self.rfile.read(length) or b"{}")
            asyncio.run(process(token, data))
        except Exception:
            # Отвечаем 200 даже при ошибке: иначе Telegram будет повторять
            # то же сообщение снова и снова. Ошибка останется в логах Vercel.
            logging.exception("Ошибка при обработке сообщения")
        self._reply(200, "ok")
