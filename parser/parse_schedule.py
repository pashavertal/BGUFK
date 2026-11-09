"""
================================================================================
 ПАРСЕР РАСПИСАНИЯ БГУФК  (неофициальный проект, не связан с БГУФК)
================================================================================

ЧТО ДЕЛАЕТ ЭТОТ ФАЙЛ (объяснение "как пятилетнему"):

  Представь, что в университете на доске объявлений каждую неделю вешают
  большие бумажные таблицы с расписанием (это PDF-файлы на сайте).
  Наш парсер — это робот-секретарь, который:

    1. Подходит к доске (скачивает страницу sportedu.by/raspisanie-zanyatij/)
    2. Находит все листочки-таблицы (ссылки на .pdf)
    3. Фотографирует каждый листочек (скачивает PDF)
    4. Читает таблицу клеточка за клеточкой (pdfplumber)
    5. Переписывает всё аккуратно в тетрадки — по одной тетрадке на группу
       (JSON-файлы web/public/data/groups/1101.json и т.д.)
    6. Делает оглавление: какие есть факультеты и группы (index.json)

  Мини-апп потом просто открывает нужную "тетрадку" своей группы.

ПОЧЕМУ PYTHON, А НЕ JAVASCRIPT ПРЯМО В ТЕЛЕФОНЕ:
  - Браузер не даст мини-аппу скачать файл с чужого сайта (это защита CORS —
    как охранник, который не пускает чужих в здание).
  - Разбирать 60 PDF на каждом телефоне каждый раз — долго и жрёт батарейку.
  - Значит, проще один раз в несколько часов разобрать всё на "кухне"
    (GitHub Actions — бесплатный компьютер GitHub) и раздать готовое блюдо.
  - Python ты уже знаешь, а pdfplumber — одна из лучших библиотек для таблиц в PDF.

КАК ЗАПУСТИТЬ У СЕБЯ:
    python3 -m venv .venv                      # создать "песочницу" для библиотек
    .venv/bin/pip install -r parser/requirements.txt
    .venv/bin/python parser/parse_schedule.py

ВАЖНО: код написан так, чтобы работать и на Python 3.9 (он стоит на твоём Mac),
и на новых версиях. Поэтому тут нет новых штук вроде `match` или `str | None`.
"""

# Эта строчка позволяет писать подсказки типов вроде `list[str]` даже в Python 3.9.
# Подсказки типов — это как подписи на коробках: "здесь лежат только строки".
# Сам Python их почти не проверяет, но они помогают тебе и редактору кода.
from __future__ import annotations

import datetime as dt          # работа с датами (2026-11-02, понедельник и т.д.)
import hashlib                 # делает короткий "отпечаток" строки — для имён файлов в кеше
import json                    # сохранение данных в формате JSON (его понимает JavaScript)
import re                      # регулярные выражения — "поиск по шаблону" в тексте
import sys                     # чтобы завершить программу с кодом ошибки
import time                    # чтобы делать паузы между скачиваниями
import urllib.request          # встроенный в Python способ скачивать из интернета
from collections import Counter
from pathlib import Path       # удобная работа с путями к файлам

import pdfplumber              # та самая библиотека, которая "видит" таблицы в PDF


# ------------------------------------------------------------------------------
#  НАСТРОЙКИ (константы). Пишутся БОЛЬШИМИ буквами — это договорённость
#  программистов: "это значение не меняется во время работы программы".
# ------------------------------------------------------------------------------

# Страница, где БГУФК выкладывает ссылки на PDF (только дневная форма — для MVP).
SCHEDULE_PAGE = "https://www.sportedu.by/raspisanie-zanyatij/"

# Скачиваем PDF ТОЛЬКО с этого адреса. Зачем: на странице нашлась посторонняя
# ссылка на какой-то левый сайт. Робот не должен ходить куда попало —
# это как сказать ребёнку "бери конфеты только у мамы".
ALLOWED_PDF_PREFIXES = (
    "https://www.sportedu.by/wp-content/uploads/",
    "http://www.sportedu.by/wp-content/uploads/",
)

# Куда складывать результат. Path(__file__) — это путь к ЭТОМУ файлу.
# .parent — папка parser/, ещё .parent — корень проекта.
# web/public/ — особая папка Vite: всё оттуда копируется на сайт как есть.
ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / "web" / "public" / "data"

# Кеш — "кладовка" для скачанных PDF, чтобы при повторном запуске
# не качать одно и то же заново (бережём и свой интернет, и сайт БГУФК).
CACHE_DIR = Path(__file__).resolve().parent / ".cache"

# Как наш робот представляется сайту. Честно говорим, кто мы.
USER_AGENT = "BSUFK-schedule-unofficial-parser/1.0 (+telegram mini app)"

# Пауза между скачиваниями в секундах. 0.5 сек — чтобы не "долбить" сайт
# 60 запросами за секунду. Вежливый робот стучится, а не ломится.
DOWNLOAD_DELAY_SEC = 0.5

# Дни недели в том виде, как они написаны в PDF.
# Индекс в списке (0..6) совпадает с dt.date.weekday() в Python (понедельник = 0).
WEEKDAYS = ["ПОНЕДЕЛЬНИК", "ВТОРНИК", "СРЕДА", "ЧЕТВЕРГ", "ПЯТНИЦА", "СУББОТА", "ВОСКРЕСЕНЬЕ"]

# Шаблон времени пары: "8.30-9.55" или "8:30-09:55".
# Разбор шаблона:  (\d{1,2})  — 1-2 цифры (часы)
#                  [.:]       — точка ИЛИ двоеточие (в разных PDF по-разному!)
#                  (\d{2})    — ровно 2 цифры (минуты)
#                  \s*[-–]\s* — дефис или тире, вокруг могут быть пробелы
TIME_RE = re.compile(r"(\d{1,2})[.:](\d{2})\s*[-–]\s*(\d{1,2})[.:](\d{2})")

# Код группы — ровно 4 цифры (1101, 0103, 2406...). \b — "граница слова",
# чтобы не выдернуть 4 цифры из середины числа 2026/2027.
GROUP_RE = re.compile(r"\b\d{4}\b")

# Слова, по которым мы понимаем, что кусок текста — это МЕСТО (аудитория/зал),
# а не фамилия преподавателя. Нашли эти слова, изучив реальные PDF.
PLACE_WORDS = re.compile(
    r"бассейн|бас\.|манеж|плоск|УСК|зал|стадион|корт|л/а|ауд|каб|спорткомплекс",
    re.IGNORECASE,
)


# ==============================================================================
#  ШАГ 1. СКАЧИВАНИЕ
# ==============================================================================

def fetch(url: str) -> bytes:
    """Скачать что угодно по адресу и вернуть "сырые байты".

    timeout=30 — если сайт молчит 30 секунд, сдаёмся, а не ждём вечно.
    """
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(request, timeout=30) as response:
        return response.read()


def find_pdf_links(html: str) -> list[str]:
    """Найти на странице все ссылки на PDF с расписанием.

    Ищем в HTML кусочки вида href="....pdf". Убираем дубликаты, но сохраняем
    ПОРЯДОК: на странице сначала идёт текущая неделя, потом следующая.
    Это важно: если одна и та же группа и дата встретятся дважды,
    победит более поздний файл (обычно это исправленная версия).
    """
    links = re.findall(r'href="([^"]+?\.pdf)"', html, flags=re.IGNORECASE)
    seen: set[str] = set()
    result: list[str] = []
    for link in links:
        if link in seen:
            continue
        seen.add(link)
        if link.startswith(ALLOWED_PDF_PREFIXES):
            result.append(link)
        else:
            print(f"  ! пропускаю ссылку не с sportedu.by: {link}")
    return result


def download_pdf(url: str) -> Path:
    """Скачать PDF в кеш (или взять из кеша, если уже есть) и вернуть путь к файлу.

    Имя файла в кеше = sha1(адрес). sha1 превращает любую строку в
    одинаковой длины "отпечаток пальца": одна ссылка → всегда одно имя файла.
    Так мы не мучаемся с русскими буквами и точками в именах файлов.
    """
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    name = hashlib.sha1(url.encode("utf-8")).hexdigest()[:16] + ".pdf"
    path = CACHE_DIR / name
    if not path.exists():
        path.write_bytes(fetch(url))
        time.sleep(DOWNLOAD_DELAY_SEC)
    return path


# ==============================================================================
#  ШАГ 2. ЧИСТКА ТЕКСТА
#  Текст из PDF бывает "грязным": переносы строк, двойные пробелы,
#  слова вразрядку ("Б И О Х И М И Я"). Приводим всё к нормальному виду.
# ==============================================================================

# Ищет 3+ одиночные буквы подряд через пробел: "л е к ц и я", "Б И О Х".
# (?<!\w) — перед первой буквой НЕ должно быть другой буквы
# \w(?: \w(?!\w)){2,} — буква, потом минимум 2 раза "пробел + одиночная буква"
SPACED_LETTERS_RE = re.compile(r"(?<!\w)\w(?: \w(?!\w)){2,}")


def clean_text(text: str | None) -> str:
    """Убрать переносы строк, лишние пробелы и склеить слова вразрядку."""
    if not text:
        return ""
    text = text.replace("\n", " ")
    # Склеиваем буквы вразрядку: "л е к ц и я" -> "лекция".
    text = SPACED_LETTERS_RE.sub(lambda m: m.group(0).replace(" ", ""), text)
    text = re.sub(r"\s+", " ", text)          # много пробелов -> один
    text = re.sub(r"\s+,", ",", text)          # "слово ," -> "слово,"
    return text.strip()


def squash(text: str) -> str:
    """"Сплющить" строку: убрать все пробелы и сделать заглавной.

    Нужна для сравнения: "Л Ё Г К АЯ АТЛЕТИКА и МП" и "ЛЁГКАЯ АТЛЕТИКА и МП"
    после сплющивания одинаковые: "ЛЁГКАЯАТЛЕТИКАИМП".
    Это как сравнивать два слова, написанные разным почерком, по буквам.
    """
    return re.sub(r"\s+", "", text).upper()


# ==============================================================================
#  ШАГ 3. РАЗБОР ОДНОЙ КЛЕТОЧКИ С ПАРОЙ
#  Пример клеточки: "ПЛАВАНИЕ и МП, Вяль, Додонова, бас. с 09.11"
#  Нужно получить: предмет, тип, преподавателей, место, заметки.
# ==============================================================================

def parse_lesson_cell(text: str) -> dict:
    """Превратить текст клетки в словарь с полями пары."""
    raw = text
    notes: list[str] = []
    lesson_type = None

    # Тип занятия в скобках: "(лекция)". Вынимаем и запоминаем.
    m = re.search(r"\((лекция|лекции|практика|семинар|лаб[^)]*)\)", text, re.IGNORECASE)
    if m:
        lesson_type = m.group(1).lower()
        text = (text[: m.start()] + text[m.end():]).strip()

    # Магистратура на английском: "Предмет (Фамилия И.О.) 622 / Subject (...) 622".
    # Отрезаем английский перевод после " / " — он повторяет русскую часть.
    m = re.match(r"^(.*?[а-яА-ЯёЁ].*?)\s+/\s+[A-Za-z].*$", text)
    if m:
        text = m.group(1)
    # И формат "Предмет (Корсак М.А., Самойленко Н.С.) 534 манеж":
    # преподаватели в скобках узнаются по инициалам "М.А.".
    m = re.match(r"^([^(]+?)\s*\(([^)]*[А-ЯЁ]\.\s?[А-ЯЁ]\.[^)]*)\)\s*(.*)$", text)
    if m:
        return {
            "subject": m.group(1).strip(),
            "type": lesson_type,
            "teachers": [t.strip() for t in m.group(2).split(",") if t.strip()],
            "rooms": [m.group(3).strip()] if m.group(3).strip() else [],
            "notes": notes,
            "raw": raw,
        }

    # Заметки вида "с 09.11" (пара начнётся только с 9 ноября) или "по 20.11".
    for m in re.finditer(r"\b(с|по)\s?\d{1,2}\.\d{2}\b", text):
        notes.append(m.group(0).replace("с0", "с 0").replace("по0", "по 0"))
    text = re.sub(r"\b(с|по)\s?\d{1,2}\.\d{2}\b", "", text)

    # Делим по запятым. Первый кусок — всегда название предмета.
    # Шаблон ,(?![^()]*\)) значит "запятая, после которой НЕ идёт закрывающая
    # скобка без открывающей" — т.е. запятые ВНУТРИ скобок не трогаем:
    # "ФИЗИЧЕСКАЯ КУЛЬТУРА (гр. 4101, 4102)" останется одним куском.
    parts = [p.strip(" .") for p in re.split(r",(?![^()]*\))", text)]
    parts = [p for p in parts if p]
    subject = parts[0] if parts else raw

    # Бывает, что между предметом и фамилией забыли запятую:
    # "БЖЧ Лукашевич, 310" или "ГИМНАСТИКА и МП Подгайская".
    # Признак: предмет написан ЗАГЛАВНЫМИ, а дальше идёт слово вида "Фамилия"
    # (первая большая, остальные маленькие). Тогда отрезаем фамилию.
    words = subject.split(" ")
    for i in range(1, len(words)):
        looks_like_surname = re.fullmatch(r"[А-ЯЁ][а-яё\-]{2,}", words[i]) is not None
        before_is_caps = all(w.upper() == w or w in ("и", "в", "с", "по") or
                             sum(ch.isupper() for ch in w) * 2 >= len(w)
                             for w in words[:i])
        if looks_like_surname and before_is_caps:
            parts = [" ".join(words[:i])] + [" ".join(words[i:])] + parts[1:]
            subject = parts[0]
            break

    teachers: list[str] = []
    rooms: list[str] = []

    for part in parts[1:]:
        # "Ночевная 533" или "Подоляк УСК 229" — фамилия и место без запятой.
        m = re.match(r"^([А-ЯЁ][а-яё\-]+)\s+(.+)$", part)
        if m and (re.match(r"\d", m.group(2)) or PLACE_WORDS.match(m.group(2))):
            teachers.append(m.group(1))
            rooms.append(m.group(2))
        elif re.match(r"^[А-ЯЁ][а-яё\-]+\s*\(", part):
            teachers.append(part)              # "Шамович (английский язык)"
        elif re.search(r"\d", part) or PLACE_WORDS.search(part):
            rooms.append(part)                 # есть цифра или слово "манеж" -> место
        elif re.match(r"^[А-ЯЁ][а-яё\-]+", part) and len(part.split()) <= 2:
            teachers.append(part)              # Слово с большой буквы -> фамилия
        else:
            rooms.append(part)                 # Непонятно что -> считаем местом

    return {
        "subject": subject,
        "type": lesson_type,
        "teachers": teachers,
        "rooms": rooms,
        "notes": notes,
        "raw": raw,                            # исходный текст — на всякий случай
    }


# ==============================================================================
#  ШАГ 4. РАЗБОР ЯЧЕЙКИ С ДНЁМ НЕДЕЛИ
#
#  В PDF название дня написано ПОВЁРНУТЫМ текстом (снизу вверх). pdfplumber
#  читает его криво: то задом наперёд ("КИНЬЛЕДЕНОП 11.20"), то вообще
#  вперемешку ("к и 6 н 2 ь 1 1 .2. л е д е 0 н о П").
#
#  Поэтому мы НЕ читаем текст по порядку. Мы смотрим, КАКИЕ буквы и цифры
#  там есть, и сколько каждой. Аналогия: тебе высыпали из коробки кубики
#  с буквами П,О,Н,Е,Д,Е,Л,Ь,Н,И,К. Порядок перепутан, но набор кубиков
#  однозначно говорит: "это ПОНЕДЕЛЬНИК". Такой "набор с количеством"
#  в Python называется Counter (мультимножество).
# ==============================================================================

def letters_of(text: str) -> Counter:
    """Набор русских букв ячейки (заглавными) с количеством."""
    return Counter(ch for ch in text.upper() if "А" <= ch <= "Я" or ch == "Ё")


def digits_of(text: str) -> Counter:
    """Набор цифр ячейки с количеством. "02.11" -> {0:1, 2:1, 1:2}."""
    return Counter(ch for ch in text if ch.isdigit())


def contains(big: Counter, small: Counter) -> bool:
    """Есть ли в большом наборе кубиков все кубики из маленького?"""
    return all(big[k] >= v for k, v in small.items())


def detect_weekday(text: str) -> int | None:
    """Понять день недели по набору букв. Вернуть 0..6 или None."""
    cell = letters_of(text)
    best = None
    for index, name in enumerate(WEEKDAYS):
        need = letters_of(name)
        if contains(cell, need):
            # Если подходит несколько (теоретически) — берём самое длинное слово.
            if best is None or len(name) > len(WEEKDAYS[best]):
                best = index
    return best


def resolve_week_dates(day_cells: list[tuple[int, int, str]]) -> dict[int, str]:
    """Определить настоящие даты для всех дней в таблице.

    day_cells — список (номер_строки, день_недели, текст_ячейки).
    Возвращает {номер_строки: "2026-11-02"}.

    Идея: перебираем все понедельники примерно ±4 месяца от сегодня и для
    каждого проверяем: "если неделя начинается с этого понедельника, то во
    вторник должно быть 03.11 — есть ли в ячейке вторника цифры 0,3,1,1?"
    Понедельник, при котором совпало больше всего ячеек, — правильный.
    Это как подбирать ключ к замку: пробуем все ключи, берём тот, что подошёл.
    """
    if not day_cells:
        return {}
    today = dt.date.today()
    monday0 = today - dt.timedelta(days=today.weekday())
    best_monday, best_score = None, (-1, -1, 0)

    for shift in range(-18, 19):                       # 18 недель назад и вперёд
        monday = monday0 + dt.timedelta(weeks=shift)
        exact = subset = 0
        for _, weekday, text in day_cells:
            date = monday + dt.timedelta(days=weekday)
            need = digits_of(date.strftime("%d%m"))    # "0211" -> {0,2,1,1}
            have = digits_of(text)
            # Иногда в ячейке есть ещё и год: "02.11.2026" или "02.11.26".
            with_year = (need + digits_of(str(date.year)), need + digits_of(str(date.year)[2:]))
            if have == need or have in with_year:
                exact += 1                             # цифры совпали идеально
            elif contains(have, need):
                subset += 1                            # все нужные цифры есть
        # Больше совпадений = лучше. При равенстве — ближе к сегодняшнему дню.
        score = (exact, subset, -abs(shift))
        if score > best_score:
            best_monday, best_score = monday, score

    if best_monday is None or best_score[0] + best_score[1] == 0:
        return {}
    return {
        row: (best_monday + dt.timedelta(days=weekday)).isoformat()
        for row, weekday, _ in day_cells
    }


# ==============================================================================
#  ШАГ 5. РАЗБОР ЦЕЛОЙ ТАБЛИЦЫ (одной страницы PDF)
# ==============================================================================

# Короткие названия факультетов. В заголовках PDF факультет иногда написан
# полностью ("Института менеджмента спорта и туризма"), а иногда сокращённо.
# Приводим к одному виду, чтобы в списке не было двух одинаковых факультетов.
FACULTY_ALIASES = {
    "ИНСТИТУТАМЕНЕДЖМЕНТАСПОРТАИТУРИЗМА": "ИМСиТ",
    "ИНСТИТУТМЕНЕДЖМЕНТАСПОРТАИТУРИЗМА": "ИМСиТ",
}


def faculty_from_title(page_text: str) -> str:
    """Из заголовка "для студентов I курса СПФ СИиЕ на первый семестр"
    достать факультет ("СПФ СИиЕ"). Если не вышло — "Другое"
    (потом попробуем угадать по коду группы, см. guess_unknown_faculties)."""
    text = re.sub(r"\s+", " ", page_text)
    m = re.search(r"для\s+\w+\s+(?:[IVX]+|\d)\s*-?\w*\s+курса\s+(.+?)\s+на\s", text)
    if m:
        name = m.group(1).strip()
        return FACULTY_ALIASES.get(squash(name), name)
    if re.search(r"магистр", text, re.IGNORECASE):
        return "Магистратура"
    return "Другое"


def to_hhmm(h: str, m: str) -> str:
    """'8', '30' -> '08:30'. Единый формат нужен, чтобы сравнивать время строками."""
    return f"{int(h):02d}:{m}"


def find_header(table: list[list[str | None]]) -> tuple[int, dict[int, str]] | None:
    """Найти строку с кодами групп и вернуть (номер_строки, {колонка: код_группы}).

    Код группы — 4 цифры В НАЧАЛЕ ячейки: "1101" или "4101 (ТиГ)".
    Если ячейка заголовка None — колонка принадлежит той же группе, что
    слева (так выглядят подгруппы: одна группа, две колонки под ней).
    """
    for i, row in enumerate(table[:4]):
        cells = [(c or "").strip() for c in row]
        if not any(re.match(r"^\d{4}\b", c) for c in cells[2:]):
            continue
        column_group: dict[int, str] = {}
        current = None
        for col in range(2, len(row)):
            m = re.match(r"^(\d{4})\b", cells[col])
            if m:
                current = m.group(1)
            elif row[col] is not None:
                current = None               # в заголовке что-то другое — не группа
            if current:
                column_group[col] = current
        return i, column_group
    return None


def parse_table(
    table: list[list[str | None]],
    previous_header: dict[int, str] | None,
    fallback_monday: dt.date | None = None,
) -> dict:
    """Разобрать одну таблицу.

    Возвращает словарь:
      { "groups": {"1101": "Баскетбол", ...},           <- код: специализация
        "columns": {2: "1101", 3: "1102", ...},          <- для следующей страницы
        "days": { "1101": { "2026-11-02": {"off": False, "lessons": [...]} } } }

    Как устроена таблица (смотри PDF):
      строка 0:  Дни/дата | Часы      | 1101      | 1102   | ...  <- коды групп
      строка 1:  None     | None      | Баскетбол | Теннис | ...  <- специализации
      дальше:    ДЕНЬ     | 8.30-9.55 | пара      | пара   | ...

    pdfplumber ставит None в клетку, если она ОБЪЕДИНЕНА с соседней.
    Например, лекция у 4 групп сразу — одна широкая клетка: текст в первой,
    а в трёх следующих None. Значит None = "то же, что слева".

    previous_header — колонки групп из прошлой таблицы этого же PDF.
    Нужно, когда таблица продолжается на 2-й странице БЕЗ строки заголовка.

    fallback_monday — понедельник недели, если в самой таблице дат нет
    (так бывает в неделю практики: в ячейках дней только названия дней).
    """
    header = find_header(table)
    if header:
        header_idx, column_group = header
        body_start = header_idx + 1
    elif previous_header and len(table[0]) > max(previous_header):
        header_idx, column_group = -1, previous_header
        body_start = 0
    else:
        return {"groups": {}, "columns": {}, "days": {}}

    # Специализация — строка под кодами, если в ней нет времени пары.
    specs: dict[str, str] = {}
    if header_idx >= 0 and header_idx + 1 < len(table):
        spec_row = table[header_idx + 1]
        if not TIME_RE.search(spec_row[1] or ""):
            body_start += 1
            for col, code in column_group.items():
                if col < len(spec_row) and spec_row[col] and code not in specs:
                    specs[code] = clean_text(spec_row[col])

    groups = {code: specs.get(code, "") for code in column_group.values()}
    days: dict[str, dict[str, dict]] = {code: {} for code in groups}
    body = table[body_start:]

    # --- Проход 1: найти строки, где начинается новый день, и понять даты ---
    # Иногда pdfplumber режет ячейку дня на куски в разных строках:
    # "11.41\nА" в одной строке и "ТОББУС" через строку (это "СУББОТА 14.11").
    # По отдельности ни один кусок не похож на день, поэтому нераспознанные
    # куски копим и пробуем распознать их вместе. День начинается со строки
    # ПЕРВОГО куска — иначе первые пары субботы ушли бы в пятницу.
    day_cells: list[tuple[int, int, str]] = []
    pending: list[tuple[int, str]] = []          # (строка, текст) нераспознанных кусков
    for i, row in enumerate(body):
        if not row or not row[0]:
            continue
        weekday = detect_weekday(row[0])
        if weekday is not None:
            day_cells.append((i, weekday, row[0]))
            pending = []
            continue
        pending.append((i, row[0]))
        joined = "\n".join(text for _, text in pending)
        weekday = detect_weekday(joined)
        if weekday is not None:
            day_cells.append((pending[0][0], weekday, joined))
            pending = []
    dates = resolve_week_dates(day_cells)
    if not dates and day_cells and fallback_monday:
        dates = {
            row: (fallback_monday + dt.timedelta(days=weekday)).isoformat()
            for row, weekday, _ in day_cells
        }

    # Неделя практики: вместо пар одна большая ячейка
    # "ПРОИЗВОДСТВЕННАЯ ПЕДАГОГИЧЕСКАЯ ПРАКТИКА (6 НЕДЕЛЬ)".
    practice = practice_note(body)

    # --- Проход 2: пройтись по строкам и разложить пары по дням и группам ---
    current_date: str | None = None
    for i, row in enumerate(body):
        if i in dates:
            current_date = dates[i]
            for code in groups:
                days[code].setdefault(current_date, {"off": False, "lessons": []})
        if not current_date or not row:
            continue

        # "ВЫХОДНОЙ" где-то в строке — помечаем день как выходной.
        row_text = " ".join(clean_text(c) for c in row[2:] if c)
        if "ВЫХОДНОЙ" in squash(row_text):
            for code in groups:
                days[code][current_date]["off"] = True
            continue

        time_match = TIME_RE.search(row[1] or "") if len(row) > 1 else None
        if not time_match:
            continue
        start = to_hhmm(time_match.group(1), time_match.group(2))
        end = to_hhmm(time_match.group(3), time_match.group(4))

        # Заполняем объединённые клетки: None -> берём текст слева.
        filled: dict[int, str] = {}
        last = ""
        for col in range(2, len(row)):
            if row[col] is not None:
                last = clean_text(row[col])
            filled[col] = last

        # Собираем пары по группам. У группы может быть несколько колонок
        # (подгруппы), тогда разные тексты = разные подгруппы.
        per_group: dict[str, list[str]] = {}
        for col, code in column_group.items():
            text = filled.get(col, "")
            if text and text not in per_group.setdefault(code, []):
                per_group[code].append(text)

        for code, texts in per_group.items():
            for idx, text in enumerate(texts):
                lesson = parse_lesson_cell(text)
                lesson["start"] = start
                lesson["end"] = end
                if len(texts) > 1:
                    lesson["subgroup"] = idx + 1
                days[code][current_date]["lessons"].append(lesson)

    # Помечаем практику, только если в таблице вообще нет пар — чтобы не
    # подписать "практикой" обычный свободный день у учащейся группы.
    if practice and not any(d["lessons"] for g in days.values() for d in g.values()):
        for group_days in days.values():
            for day in group_days.values():
                if not day["off"]:
                    day["note"] = practice

    return {"groups": groups, "columns": column_group, "days": days}


def practice_note(body: list[list[str | None]]) -> str | None:
    """Найти в таблице упоминание практики и вернуть его в читаемом виде:
    "ПРОИЗВОДСТВЕННАЯ ПЕДАГОГИЧЕСКАЯ ПРАКТИКА (6 НЕДЕЛЬ)"
    -> "Производственная педагогическая практика (6 недель)".
    Текст может быть разбит на соседние ячейки — собираем их по порядку."""
    parts: list[str] = []
    for row in body:
        for cell in row[1:]:
            text = clean_text(cell or "")
            if text and not TIME_RE.search(text) and text not in parts:
                parts.append(text)
    joined = " ".join(parts)
    m = re.search(r"[А-ЯЁ ]*ПРАКТИК[А-ЯЁ]*(?:\s*\([^)]*\))?", joined.upper())
    if not m:
        return None
    note = re.sub(r"\s+", " ", m.group(0)).strip().lower()
    return note[:1].upper() + note[1:]


# ==============================================================================
#  ШАГ 6. ПРИВЕДЕНИЕ НАЗВАНИЙ ПРЕДМЕТОВ К ОДНОМУ ВИДУ
#  Один и тот же предмет в разных клетках может быть написан нормально
#  ("ИНОСТРАННЫЙ ЯЗЫК") или вразрядку ("И Н О С Т Р А Н Н Ы Й Я З Ы К").
#  После склейки второй превращается в "ИНОСТРАННЫЙЯЗЫК" — без пробела.
#  Решение: собираем "словарик" нормальных написаний из всех PDF и
#  подменяем по "сплющенной" форме. Как исправлять опечатки по словарю.
# ==============================================================================

def normalize_subjects(all_days: dict[str, dict[str, dict]]) -> None:
    variants: dict[str, Counter] = {}
    for days in all_days.values():
        for day in days.values():
            for lesson in day["lessons"]:
                key = squash(lesson["subject"])
                variants.setdefault(key, Counter())[lesson["subject"]] += 1

    def best(counter: Counter) -> str:
        # Лучшее написание: 1) без "обломков" — одиночных заглавных букв
        # вроде "П СМ" или "Т - М О"; 2) самое частое (как голосование:
        # побеждает вариант, который встречается в большинстве клеток).
        def has_fragments(s: str) -> bool:
            return re.search(r"(?:^|\s)[А-ЯЁ](?:\s|$)", s) is not None
        # 3) без "склеенных" слов из 15+ букв ("ИНОСТРАННЫЙЯЗЫК").
        def has_glued(s: str) -> bool:
            return any(len(word) >= GLUED_MIN_LEN for word in s.split())
        return max(counter, key=lambda s: (not has_fragments(s), not has_glued(s), counter[s]))

    canonical = {key: best(counter) for key, counter in variants.items()}

    # Словарь "нормальных" слов из всех предметов — чтобы разрезать склейки.
    vocabulary = {
        word.upper()
        for subject in canonical.values()
        for word in subject.split()
        if len(word) < GLUED_MIN_LEN and word.isalpha()
    }

    for days in all_days.values():
        for day in days.values():
            for lesson in day["lessons"]:
                subject = canonical[squash(lesson["subject"])]
                lesson["subject"] = " ".join(
                    split_glued(word, vocabulary) if len(word) >= GLUED_MIN_LEN else word
                    for word in subject.split()
                )


# Слово из стольких букв подозреваем в "склейке". Самые длинные нормальные
# слова в расписании ("ЖИЗНЕДЕЯТЕЛЬНОСТИ" — 17) встречаются и отдельно,
# поэтому split_glued их не испортит: они найдутся в словаре целиком.
GLUED_MIN_LEN = 15


def split_glued(word: str, vocabulary: set[str]) -> str:
    """Разрезать склейку по словарю: "ТЕОРИЯИМЕТОДИКА" -> "ТЕОРИЯ И МЕТОДИКА".

    Метод — "динамическое программирование". Аналогия: собрать слово из
    кубиков-слов так, чтобы кубиков было как можно МЕНЬШЕ (длинные кубики
    лучше: "МЕТОДИКА" лучше, чем "МЕТО"+"ДИКА").
    best[i] = лучший способ собрать первые i букв.
    Если собрать целиком не получилось — возвращаем слово как было.
    """
    upper = word.upper()
    if upper in vocabulary:
        return word
    n = len(upper)
    best: list[list[str] | None] = [None] * (n + 1)
    best[0] = []
    for end in range(1, n + 1):
        for start in range(max(0, end - 20), end):    # слова длиннее 20 букв не ищем
            prev = best[start]
            piece = upper[start:end]
            if prev is not None and piece in vocabulary:
                candidate = prev + [word[start:end]]
                if best[end] is None or len(candidate) < len(best[end]):
                    best[end] = candidate
    return " ".join(best[n]) if best[n] else word


def guess_unknown_faculties(group_info: dict[str, dict]) -> None:
    """Если у группы факультет "Другое" (заголовок PDF не прочитался),
    угадываем по первой цифре кода: у групп одного факультета она одинаковая
    (1xxx — СПФ СИиЕ, 2xxx — СПФ МВС, 0xxx — ФОФК...). Берём факультет,
    который чаще всего встречается у "соседей" с той же первой цифрой.
    Мы ничего не придумываем сами: соответствие узнаём из тех же PDF.
    """
    by_digit: dict[str, Counter] = {}
    for info in group_info.values():
        if info["faculty"] != "Другое":
            by_digit.setdefault(info["code"][0], Counter())[info["faculty"]] += 1
    for info in group_info.values():
        if info["faculty"] == "Другое" and info["code"][0] in by_digit:
            info["faculty"] = by_digit[info["code"][0]].most_common(1)[0][0]


def monday_from_url(url: str) -> dt.date | None:
    """В имени файла часто есть дата начала недели: "...-s-09.11-3-kurs.pdf"."""
    m = re.search(r"(?<!\d)(\d{2})\.(\d{2})(?:\.(\d{4}))?(?!\d)", url.rsplit("/", 1)[-1])
    if not m:
        return None
    today = dt.date.today()
    day, month = int(m.group(1)), int(m.group(2))
    years = [int(m.group(3))] if m.group(3) else [today.year - 1, today.year, today.year + 1]
    candidates = []
    for year in years:
        try:
            candidates.append(dt.date(year, month, day))
        except ValueError:
            pass
    if not candidates:
        return None
    date = min(candidates, key=lambda d: abs((d - today).days))
    return date - dt.timedelta(days=date.weekday())


def guess_monday(all_file_days: list[dict[str, dict[str, dict]]]) -> dt.date | None:
    """Самая частая неделя среди файлов с датами. При равенстве (в воскресенье
    на сайте висят две недели) — более поздняя: практику публикуют на новую."""
    weeks: Counter = Counter()
    for file_days in all_file_days:
        mondays = set()
        for days in file_days.values():
            for iso in days:
                date = dt.date.fromisoformat(iso)
                mondays.add(date - dt.timedelta(days=date.weekday()))
        weeks.update(mondays)
    if not weeks:
        return None
    return max(weeks, key=lambda monday: (weeks[monday], monday))


# ==============================================================================
#  ШАГ 7. ГЛАВНАЯ ФУНКЦИЯ — собирает всё вместе
# ==============================================================================

def main() -> int:
    print(f"Скачиваю страницу {SCHEDULE_PAGE}")
    html = fetch(SCHEDULE_PAGE).decode("utf-8", errors="replace")
    links = find_pdf_links(html)
    print(f"Нашёл PDF: {len(links)}")

    # Итоговые "тетрадки": group_info[код] = {факультет, специализация, курс}
    group_info: dict[str, dict] = {}
    group_days: dict[str, dict[str, dict]] = {}
    failed: list[str] = []

    def parse_file(url: str, fallback_monday: dt.date | None) -> dict[str, dict[str, dict]]:
        path = download_pdf(url)
        # file_days — дни только из ЭТОГО файла. Внутри одного файла день
        # может продолжаться на следующей странице, поэтому пары ДОБАВЛЯЕМ.
        file_days: dict[str, dict[str, dict]] = {}
        with pdfplumber.open(path) as pdf:
            faculty = faculty_from_title(pdf.pages[0].extract_text() or "")
            previous_header = None
            for page in pdf.pages:
                for table in page.extract_tables():
                    result = parse_table(table, previous_header, fallback_monday)
                    if result["columns"]:
                        previous_header = result["columns"]
                    for code, spec in result["groups"].items():
                        info = group_info.setdefault(code, {
                            "code": code,
                            "faculty": faculty,
                            "spec": spec,
                            # Вторая цифра кода = курс: 1101 -> 1 курс, 2406 -> 4 курс.
                            "course": int(code[1]) if code[1] in "123456" else None,
                        })
                        if spec and not info["spec"]:
                            info["spec"] = spec
                        for date, day in result["days"][code].items():
                            target = file_days.setdefault(code, {}).setdefault(
                                date, {"off": False, "lessons": []}
                            )
                            target["off"] = target["off"] or day["off"]
                            target["lessons"].extend(day["lessons"])
                            if day.get("note"):
                                target["note"] = day["note"]
        print(f"  ok  {len(file_days):3d} групп  {faculty:<12}  {url.rsplit('/', 1)[-1]}")
        return file_days

    # Файлы, в которых не нашлось ни одной даты (неделя практики), откладываем:
    # разберём их в конце, когда по остальным PDF станет понятно, какая неделя.
    undated: list[str] = []
    dated: list[tuple[str, dict[str, dict[str, dict]]]] = []
    for url in links:
        try:
            file_days = parse_file(url, None)
            if file_days:
                dated.append((url, file_days))
            else:
                undated.append(url)
        except Exception as error:  # один битый PDF не должен ронять всё
            failed.append(url)
            print(f"  ERR {url}: {error}")

    if undated:
        guessed = guess_monday([days for _, days in dated])
        print(f"Без дат: {len(undated)} PDF, беру неделю с {guessed}")
        for url in undated:
            try:
                monday = monday_from_url(url) or guessed
                file_days = parse_file(url, monday)
                if file_days:
                    dated.append((url, file_days))
            except Exception as error:
                failed.append(url)
                print(f"  ERR {url}: {error}")

    # Между РАЗНЫМИ файлами более поздний (по порядку ссылок на сайте)
    # перезаписывает день целиком: поздняя ссылка = более свежая версия.
    order = {url: i for i, url in enumerate(links)}
    for _, file_days in sorted(dated, key=lambda item: order[item[0]]):
        for code, days in file_days.items():
            group_days.setdefault(code, {}).update(days)

    if not group_days:
        # Если ничего не получилось — НЕ перезаписываем старые данные пустотой.
        print("Не удалось разобрать ни одной группы. Данные не обновлены.")
        return 1

    normalize_subjects(group_days)
    guess_unknown_faculties(group_info)
    generated_at = dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds")

    # --- Сохраняем тетрадки групп ---
    groups_dir = OUT_DIR / "groups"
    groups_dir.mkdir(parents=True, exist_ok=True)
    for old in groups_dir.glob("*.json"):
        old.unlink()                         # удаляем группы, которых больше нет
    for code, days in group_days.items():
        for day in days.values():
            day["lessons"].sort(key=lambda l: (l["start"], l.get("subgroup", 0)))
        payload = {**group_info[code], "generatedAt": generated_at, "days": dict(sorted(days.items()))}
        # ensure_ascii=False — чтобы русские буквы остались буквами, а не А...
        # separators без пробелов — файл меньше, телефон быстрее скачает.
        (groups_dir / f"{code}.json").write_text(
            json.dumps(payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8"
        )

    # --- Сохраняем оглавление: факультеты -> группы ---
    faculties: dict[str, list[dict]] = {}
    for info in group_info.values():
        if info["code"] in group_days:
            faculties.setdefault(info["faculty"], []).append(
                {"code": info["code"], "spec": info["spec"], "course": info["course"]}
            )
    index = {
        "generatedAt": generated_at,
        "source": SCHEDULE_PAGE,
        "faculties": [
            {"name": name, "groups": sorted(groups, key=lambda g: g["code"])}
            for name, groups in sorted(faculties.items())
        ],
    }
    (OUT_DIR / "index.json").write_text(json.dumps(index, ensure_ascii=False, indent=1), encoding="utf-8")

    print(f"Готово: {len(group_days)} групп, {len(faculties)} факультетов, ошибок: {len(failed)}")
    return 0


# Этот блок выполняется, только если файл запустили напрямую
# (python parse_schedule.py), а не импортировали из другого файла.
if __name__ == "__main__":
    sys.exit(main())
