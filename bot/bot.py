"""
Telegram-бот «Расписание пар БГУФК» (aiogram 3).

Что делает:
  /start (и /help) — приветствие, пометка о неофициальности, коротко о боте
                     и кнопка «Открыть расписание», которая открывает мини-апп.
  Любое другое сообщение — короткая подсказка, как открыть расписание.

При запуске бот сам настраивает в Telegram:
  - кнопку меню слева от поля ввода (открывает мини-апп);
  - описание (видно до нажатия «Старт») и короткое описание (в профиле);
  - список команд.
Так это не нужно вручную делать в @BotFather.

Запуск:  .venv/bin/python bot/bot.py   (токен берётся из bot/.env)
"""
from __future__ import annotations

import asyncio
import logging
import os
from pathlib import Path

from aiogram import Bot, Dispatcher, F
from aiogram.client.default import DefaultBotProperties
from aiogram.enums import ParseMode
from aiogram.filters import Command, CommandStart
from aiogram.types import (
    BotCommand,
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    MenuButtonWebApp,
    Message,
    WebAppInfo,
)

WEBAPP_URL = "https://pashavertal.github.io/BGUFK/"
FEEDBACK_USERNAME = "Runnwayy"

WELCOME_TEXT = (
    "👋 <b>Привет! Это расписание пар БГУФК.</b>\n"
    "\n"
    "Здесь — пары твоей группы на сегодня и на неделю: время, аудитория "
    "и преподаватель. Без регистрации, расписание обновляется само "
    "несколько раз в день.\n"
    "\n"
    "<b>Как открыть:</b>\n"
    "• нажми кнопку «Открыть расписание» под этим сообщением,\n"
    "• или кнопку «Расписание» слева от поля ввода.\n"
    "Первый раз выбери факультет и группу — дальше приложение запомнит их.\n"
    "\n"
    "⚠️ <i>Неофициальное приложение. Не связано с БГУФК и не одобрено им. "
    "Расписание берётся из открытых PDF на sportedu.by — при сомнениях "
    "сверяйся с официальным расписанием.</i>\n"
    "\n"
    f"Нашёл ошибку или есть идея — пиши @{FEEDBACK_USERNAME}"
)

HINT_TEXT = "Чтобы посмотреть пары, нажми «Открыть расписание» 👇"

# Описание бота до нажатия «Старт» (до 512 символов) и короткое в профиле (до 120).
DESCRIPTION = (
    "Расписание пар БГУФК для твоей группы: сегодня и на неделю.\n\n"
    "Неофициальное приложение, не связано с БГУФК. "
    "Данные — из открытых PDF на sportedu.by."
)
SHORT_DESCRIPTION = "Расписание пар БГУФК. Неофициальное приложение."


def open_keyboard() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(inline_keyboard=[[
        InlineKeyboardButton(text="📅 Открыть расписание", web_app=WebAppInfo(url=WEBAPP_URL)),
    ]])


dp = Dispatcher()


@dp.message(CommandStart())
@dp.message(Command("help"))
async def on_start(message: Message) -> None:
    await message.answer(WELCOME_TEXT, reply_markup=open_keyboard())


@dp.message(F.chat.type == "private")
async def on_other(message: Message) -> None:
    await message.answer(HINT_TEXT, reply_markup=open_keyboard())


async def setup_bot_profile(bot: Bot) -> None:
    """Кнопка меню, описания и команды. Telegram хранит их у себя,
    поэтому достаточно, чтобы это выполнилось хотя бы один раз."""
    await bot.set_chat_menu_button(
        menu_button=MenuButtonWebApp(text="Расписание", web_app=WebAppInfo(url=WEBAPP_URL)),
    )
    await bot.set_my_description(DESCRIPTION)
    await bot.set_my_short_description(SHORT_DESCRIPTION)
    await bot.set_my_commands([BotCommand(command="start", description="Как открыть расписание")])


def read_token() -> str:
    """Токен из переменной окружения BOT_TOKEN или из файла bot/.env."""
    token = os.environ.get("BOT_TOKEN", "").strip()
    env_file = Path(__file__).with_name(".env")
    if not token and env_file.exists():
        for line in env_file.read_text(encoding="utf-8").splitlines():
            key, _, value = line.partition("=")
            if key.strip() == "BOT_TOKEN":
                token = value.strip().strip('"').strip("'")
    if not token:
        raise SystemExit("Нет токена: создай bot/.env по образцу bot/.env.example и впиши BOT_TOKEN.")
    return token


async def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    bot = Bot(read_token(), default=DefaultBotProperties(parse_mode=ParseMode.HTML))
    await setup_bot_profile(bot)
    me = await bot.get_me()
    logging.info("Бот @%s запущен. Остановить: Ctrl+C", me.username)
    # Старые сообщения, пришедшие, пока бот был выключен, пропускаем,
    # чтобы человек не получил пачку приветствий разом.
    await bot.delete_webhook(drop_pending_updates=True)
    await dp.start_polling(bot)


if __name__ == "__main__":
    asyncio.run(main())
