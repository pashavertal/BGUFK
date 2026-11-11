"""
Telegram-бот «Расписание пар БГУФК» (aiogram 3) — общая часть:
тексты, ответы на сообщения и настройка профиля бота.
Запускается двумя способами:
  bot/api/webhook.py — на Vercel, круглосуточно (основной режим);
  bot/bot.py         — у себя на компьютере, для проверки.

Что делает:
  /start (и /help) — приветствие, пометка о неофициальности, коротко о боте
                     и кнопка «Открыть расписание», которая открывает мини-апп.
  Любое другое сообщение — короткая подсказка, как открыть расписание.

setup_bot_profile() (вызывают bot.py и set_webhook.py) настраивает в Telegram:
  - кнопку меню слева от поля ввода (открывает мини-апп);
  - описание (видно до нажатия «Старт») и короткое описание (в профиле);
  - список команд.
Так это не нужно вручную делать в @BotFather.
"""
from __future__ import annotations

import hashlib
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
CHANNEL_USERNAME = "studentsbgufk"

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
    f"📣 Новости и обновления — в канале @{CHANNEL_USERNAME}\n"
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


def make_bot(token: str) -> Bot:
    return Bot(token, default=DefaultBotProperties(parse_mode=ParseMode.HTML))


def webhook_secret(token: str) -> str:
    """Секрет, по которому вебхук понимает, что запрос пришёл именно от Telegram.
    Вычисляется из токена, поэтому его не нужно хранить отдельно."""
    return hashlib.sha256(f"webhook:{token}".encode()).hexdigest()[:48]


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
        raise RuntimeError("Нет токена: создай bot/.env по образцу bot/.env.example и впиши BOT_TOKEN.")
    return token
