import logging
import os
import asyncio
import uuid
import emoji
from html import escape
from dotenv import load_dotenv
from aiogram import Bot, Dispatcher, types, F
from aiogram.types import InlineKeyboardButton, CallbackQuery
from aiogram.filters import CommandStart, Command, CommandObject
from aiogram.utils.keyboard import InlineKeyboardBuilder
from aiogram.client.default import DefaultBotProperties
from aiogram.enums.parse_mode import ParseMode
from aiogram.exceptions import TelegramForbiddenError, TelegramAPIError

from classify import classify_message, train, dataset

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()

# Конфигурационные переменные
CONFIG = {
    "GROUP_USER_ID": int(os.getenv("GROUP_USER_ID", -1003423286221)),
    "CHAT_IDS": list(map(int, os.getenv("CHAT_IDS", "").split(','))),
    "JOURNAL_CHAT_ID": int(os.getenv("JOURNAL_CHAT_ID")),
    "CHANNEL_ID": int(os.getenv("CHANNEL_ID")),
    "ALLOWED_FORWARDS": {int(os.getenv("CHANNEL_ID"))},
}

bot = Bot(os.getenv("TOKEN"), default=DefaultBotProperties(parse_mode=ParseMode.HTML))
dp = Dispatcher()

# Хранилища
messages_by_session = {}
message_storage = {}


# Утилиты
def get_message_content(msg: types.Message) -> str:
    """Извлекает текст или подпись из сообщения"""
    if msg.text:
        return msg.text
    if msg.caption:
        return msg.caption
    return "текст сообщения отсутствует"


async def is_user_admin(chat_id: int, user_id: int) -> bool:
    """Проверяет права администратора"""
    try:
        member = await bot.get_chat_member(chat_id, user_id)
        return member.status in ['administrator', 'creator']
    except TelegramAPIError:
        return False


# Обработчики команд
@dp.message(CommandStart())
async def start(message: types.Message):
    if message.chat.type == types.ChatType.PRIVATE:
        await message.reply("❌ Бот не предназначен для работы в личных сообщениях!")


@dp.message(Command("add"))
async def add_phrase(message: types.Message, command: CommandObject):
    if message.chat.id != CONFIG["JOURNAL_CHAT_ID"]:
        await message.reply("❌ Нет доступа")
        return

    if not command.args:
        await message.reply("❌ Укажите текст сообщения")
        return

    message_id = str(uuid.uuid4())
    message_storage[message_id] = command.args.replace('\n', ' ').strip()

    keyboard = InlineKeyboardBuilder()
    keyboard.add(InlineKeyboardButton(text="Спам", callback_data=f"add:spam:{message_id}"))
    keyboard.add(InlineKeyboardButton(text="Не спам", callback_data=f"add:ham:{message_id}"))

    await message.reply(
        f"<b>Выберите тип сообщения</b>\n\n<blockquote>{escape(command.args)}</blockquote>"
        "\n\nHAM - не спам, SPAM - спам",
        reply_markup=keyboard.as_markup()
    )


# Обработчики колбэков
@dp.callback_query(F.data.startswith("add:"))
async def handle_add_category(callback: CallbackQuery):
    data = callback.data.split(':')
    category, message_id = data[1], data[2]

    if (text := message_storage.get(message_id)) is None:
        return await callback.answer("❌ Сообщение не найдено")

    confirmation_keyboard = InlineKeyboardBuilder()
    confirmation_keyboard.button(text="✅ Подтвердить", callback_data=f"confirm_add:{category}:{message_id}")
    confirmation_keyboard.button(text="❌ Отменить", callback_data="cancel_add")

    await callback.message.edit_text(
        f"Вы уверены, что хотите добавить это сообщение как {category.upper()}?\n\n"
        f"<blockquote>{escape(text)}</blockquote>",
        reply_markup=confirmation_keyboard.as_markup()
    )
    await callback.answer()


@dp.callback_query(F.data.startswith("confirm_add:"))
async def confirm_adding(callback: CallbackQuery):
    data = callback.data.split(':')
    category, message_id = data[1], data[2]

    if (text := message_storage.pop(message_id, None)) is None:
        return await callback.answer("❌ Сообщение не найдено")

    with open(dataset, 'a', encoding='utf-8') as f:
        f.write(f"\n{category} {text}")

    accuracy = train("retrain") * 100  # Предполагаем безопасный метод обучения
    await callback.message.edit_text(
        f"✅ Сообщение добавлено как {category}\n\n"
        f"<blockquote>{escape(text)}</blockquote>"
        f"\n<b>Тестовая точность: {accuracy:.0f}%</b>"
    )


@dp.callback_query(F.data == "cancel_add")
async def cancel_adding(callback: CallbackQuery):
    await callback.message.delete()
    await callback.answer("Добавление отменено")


# Основной обработчик сообщений
@dp.message()
async def check_spam(message: types.Message):
    if message.chat.id not in CONFIG["CHAT_IDS"]:
        return

    # Проверка прав администратора
    if await is_user_admin(message.chat.id, message.from_user.id):
        return

    # Проверка пересланных сообщений
    if message.forward_origin:
        if isinstance(message.forward_origin, types.MessageOriginChannel):
            if message.forward_origin.chat.id not in CONFIG["ALLOWED_FORWARDS"]:
                await handle_spam(message, "forward")
                return
        elif isinstance(message.forward_origin, types.MessageOriginUser):
            if message.forward_origin.sender_user.is_bot:
                await handle_spam(message, "forward_bot")
                return

    # Проверка содержания эмодзи
    if check_emojis(message.text or message.caption or ""):
        await handle_spam(message, "emojis")
        return

    # Классификация сообщения
    if classify_message(get_message_content(message)):
        await handle_spam(message, "classify")


async def handle_spam(message: types.Message, reason: str):
    """Обрабатывает спам-сообщение"""
    try:
        await message.delete()
    except TelegramForbiddenError:
        logger.error(f"No rights to delete message in chat {message.chat.id}")
        return

    await send_log(message, reason)
    await notify_user(message)


async def notify_user(message: types.Message):
    """Отправляет уведомление пользователю"""
    msg = await message.answer(
        f"<b>{message.from_user.full_name}</b>, ваше сообщение удалено по причине:\n"
        f"⚠️ {get_reason_description('emojis' if check_emojis(message.text) else 'classify')}"
    )
    await asyncio.sleep(15)
    await msg.delete()


def get_reason_description(reason: str) -> str:
    """Возвращает описание причины удаления"""
    return {
        "forward": "пересылка из неразрешенного источника",
        "forward_bot": "пересылка от бота",
        "emojis": "слишком много эмодзи",
        "classify": "распознано как спам"
    }.get(reason, "нарушение правил чата")


# Логирование событий
async def send_log(message: types.Message, reason: str):
    """Отправляет лог в журнальный чат"""
    log_text = (
        f"🚫 Удалено сообщение от <b>{message.from_user.full_name}</b>\n"
        f"👤 Пользователь: <a href='tg://user?id={message.from_user.id}'>{message.from_user.id}</a>\n"
        f"📝 Причина: {get_reason_description(reason)}\n\n"
        f"<blockquote>{escape(get_message_content(message))}</blockquote>"
    )

    keyboard = InlineKeyboardBuilder()
    if reason == "classify":
        keyboard.button(text="❗️ Ложное срабатывание", callback_data=f"false:{message.message_id}")
    keyboard.button(text="⛔️ Забанить", callback_data=f"ban:{message.message_id}")

    try:
        msg = await bot.send_message(
            CONFIG["JOURNAL_CHAT_ID"],
            log_text,
            reply_markup=keyboard.as_markup()
        )
        messages_by_session[message.message_id] = (message, msg, reason)
    except TelegramAPIError as e:
        logger.error(f"Error sending log: {e}")


# Обработка ложных срабатываний
@dp.callback_query(F.data.startswith("false:"))
async def handle_false_positive(callback: CallbackQuery):
    message_id = int(callback.data.split(':')[1])

    if (data := messages_by_session.get(message_id)) is None:
        return await callback.answer("❌ Сообщение не найдено")

    original_msg, log_msg, reason = data
    with open(dataset, 'a', encoding='utf-8') as f:
        f.write(f"\nham {get_message_content(original_msg)}")

    accuracy = train("retrain") * 100
    await log_msg.edit_text(
        f"✅ Ложное срабатывание исправлено\n\n"
        f"<blockquote>{escape(get_message_content(original_msg))}</blockquote>"
        f"\n<b>Новая точность: {accuracy:.0f}%</b>"
    )
    await callback.answer()


# Обработка бана пользователя
# Обработка бана пользователя
@dp.callback_query(F.data.startswith("ban:"))
async def handle_ban(callback: CallbackQuery):
    message_id = int(callback.data.split(':')[1])

    if (data := messages_by_session.get(message_id)) is None:
        return await callback.answer("❌ Сообщение не найдено")

    original_msg, log_msg, reason = data
    try:
        # Формируем упоминание модератора
        moderator_mention = (
            f"<a href='tg://user?id={callback.from_user.id}'>"
            f"{escape(callback.from_user.full_name)}</a>"
        )

        await bot.ban_chat_member(original_msg.chat.id, original_msg.from_user.id)
        await log_msg.edit_text(
            f"🚫 Пользователь <b>{escape(original_msg.from_user.full_name)}</b> заблокирован\n"
            f"👮‍♂️ Модератор: {moderator_mention}\n"
            f"📝 Причина: {escape(reason)}"
        )
        await callback.answer("Пользователь заблокирован")
    except TelegramForbiddenError:
        await callback.answer("❌ Нет прав для блокировки")
    except TelegramAPIError as e:
        logger.error(f"Ban error: {e}")
        await callback.answer("❌ Ошибка блокировки")


# Вспомогательные функции
def check_emojis(text: str) -> bool:
    """Проверяет наличие 3+ эмодзи в тексте"""
    return sum(1 for c in text if emoji.is_emoji(c)) >= 3


async def cleanup_storage():
    """Очищает хранилища каждые 24 часа"""
    while True:
        messages_by_session.clear()
        message_storage.clear()
        logger.info("Storage cleaned")
        await asyncio.sleep(86400)  # 24 часа


async def main():
    # Инициализация модели
    train("init")

    # Запуск фоновых задач
    asyncio.create_task(cleanup_storage())

    # Запуск бота
    await bot.delete_webhook(drop_pending_updates=True)
    await dp.start_polling(bot)


if __name__ == "__main__":
    asyncio.run(main())
