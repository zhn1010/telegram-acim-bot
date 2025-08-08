const {
    DEFAULT_LANGUAGE,
} = require('../config')

function convertToArabicNumbers(num) {
    const arabicNumbers = [
        '٠',
        '١',
        '٢',
        '٣',
        '٤',
        '٥',
        '٦',
        '٧',
        '٨',
        '٩'
    ]
    return String(num).split('').map(digit => arabicNumbers[Number(digit)]).join('')
}


function messages(lang) {
    return lang === 'fa'
        ? {
            welcome: 'به ربات درس‌های دوره ACIM خوش آمدید.',
            choose_language: 'لطفاً زبان را انتخاب کنید',
            language_set: 'زبان شما روی فارسی تنظیم شد.',
            cancelled: '🚫 لغو شد',
            paused: '⏸ متوقف شد. برای ادامه /resume را بزنید.',
            resumed: '▶️ ادامه یافت.',
            settings_updated: '✅ تنظیمات بروز شد.',
            user_not_found: '⚠️ کاربر یافت نشد. لطفاً ابتدا /start را بزنید.',
            all_done: '🎉 تمام درس‌ها را به پایان رسانده‌اید!',
            invalid_tz: 'منطقه زمانی نامعتبر است. مثال: Asia/Tehran',
            invalid_number: 'عدد نامعتبر است.',
            invalid_day_range: (max) => `عدد نامعتبر (بین 1 و ${max})`,
            invalid_time: 'فرمت باید HH:mm باشد. مثال: 06:00',
            reminders_enabled: 'یادآورها برای امروز فعال شدند!',
            reminder_failed: 'یادآوری‌ای برنامه‌ریزی نشد.',
            no_reminders: 'یادآوری‌ای برنامه‌ریزی نشد.',
            no_msg: 'استفاده: /broadcast <پیام>',
            broadcast_done: (ok, fail) => `📢 پیام ارسال شد. ✅ ${ok}، ❌ ${fail}`,
            share_location: '📍 ارسال مکان',
            timezone_set: (z) => `منطقه زمانی تنظیم شد: ${z}`,
            tz_gps_error: 'امکان تشخیص منطقه زمانی از GPS نبود.',
            course_paused: 'دوره متوقف شد',
            course_resumed: 'دوره ادامه یافت',
            enable_reminders: '✅ یادآورهای امروز را دریافت می‌کنم',
            skip_today: '❌ امروز را نادیده بگیرید',
            number: '(عدد)',
            tz_example: 'مثال: Asia/Tehran',
            preview_every: ({ everyMinutes, start, end, count }) =>
                `\n\n🕒 امروز: هر ${everyMinutes} دقیقه از ${start} تا ${end} — ${count} بار.`,
            preview_times: ({ nTimes, start, end, count }) =>
                `\n\n🕒 امروز: ${nTimes} بار بین ${start} تا ${end}${count !== nTimes ? ` — پیش‌بینی کنونی: ${count} بار` : ''}.`,
            preview_generic: ({ start, end, count }) =>
                `\n\n🕒 امروز: بین ${start} تا ${end} — ${count} بار.`,
            enable_label_every: (everyMinutes) => `✅ یادآورها (هر ${everyMinutes} دقیقه)`,
            enable_label_times: (nTimes) => `✅ یادآورها (${nTimes} بار)`,
            choose_lesson_now: (max) => `لطفاً شماره درس را برای شروع ارسال کنید (1–${max})`,
            starting_lesson: (n) => `شروع درس ${n} همین حالا…`,
            first_prompt: 'می‌خواهید همین حالا با درس ۱ شروع کنید؟',
            first_start_now: '▶️ شروع اکنون',
            first_wait_today: (t) => `⏰ منتظر بمانید تا امروز ساعت ${t}`,
            first_wait_tomorrow: (t) => `⏰ منتظر بمانید تا فردا ساعت ${t}`,
            first_started: 'در حال شروع درس ۱…',
            first_scheduled_today: (t) => `عالی — امروز ساعت ${t} برایتان ارسال می‌شود.`,
            lesson_number: (num) => `درس ${convertToArabicNumbers(num)}`,
            introduction: 'مقدمه',
        }
        : {
            welcome: 'Welcome to the ACIM Workbook Bot.',
            choose_language: 'Please choose your language',
            language_set: 'Great! Language set to English.',
            cancelled: '🚫 Cancelled',
            paused: '⏸ Paused. Use /resume to continue.',
            resumed: '▶️ Resumed.',
            settings_updated: '✅ Settings updated.',
            user_not_found: '⚠️ User not found. Please send /start first.',
            all_done: '🎉 You have completed all lessons!',
            invalid_tz: 'Invalid timezone. Example: Europe/Berlin',
            invalid_number: 'Invalid number',
            invalid_day_range: (max) => `Invalid number (must be between 1 and ${max})`,
            invalid_time: 'Format must be HH:mm, e.g. 06:00',
            reminders_enabled: 'Reminders enabled for today!',
            reminder_failed: 'Reminder could not be scheduled.',
            no_reminders: 'No reminders could be scheduled.',
            no_msg: 'Usage: /broadcast <message>',
            broadcast_done: (ok, fail) => `📢 Broadcast finished. ✅ ${ok}, ❌ ${fail}`,
            share_location: '📍 Share location',
            timezone_set: (z) => `Timezone set to ${z}`,
            tz_gps_error: 'Unable to detect timezone from GPS',
            course_paused: 'Course paused',
            course_resumed: 'Course resumed',
            enable_reminders: '✅ Enable reminders',
            skip_today: '❌ Skip for today',
            number: '(number)',
            tz_example: 'Example: Europe/Berlin',
            preview_every: ({ everyMinutes, start, end, count }) =>
                `\n\n🕒 Today: every ${everyMinutes} min from ${start} to ${end} — ${count} times.`,
            preview_times: ({ nTimes, start, end, count }) =>
                `\n\n🕒 Today: ${nTimes} times between ${start} and ${end}${count !== nTimes ? ` — current forecast: ${count} times` : ''}.`,
            preview_generic: ({ start, end, count }) =>
                `\n\n🕒 Today: between ${start} and ${end} — ${count} times.`,
            enable_label_every: (everyMinutes) => `✅ Enable reminders (every ${everyMinutes} min)`,
            enable_label_times: (nTimes) => `✅ Enable reminders (${nTimes} times)`,
            choose_lesson_now: (max) => `Send the lesson number to start now (1–${max})`,
            starting_lesson: (n) => `Starting lesson ${n} now…`,
            first_prompt: 'Do you want to start with Lesson 1 now?',
            first_start_now: '▶️ Start now',
            first_wait_today: (t) => `⏰ Wait until ${t} today`,
            first_wait_tomorrow: (t) => `⏰ Wait until ${t} tomorrow`,
            first_started: 'Starting Lesson 1 now…',
            first_scheduled_today: (t) => `Great — we’ll send your first lesson at ${t} today.`,
            lesson_number: (num) => `Lesson ${num}`,
            introduction: 'Introduction',
        }
}

function labels(lang) {
    return lang === 'fa'
        ? {
            lang: 'زبان',
            tz: 'منطقه‌زمانی',
            day: 'روز درس',
            ltime: 'ساعت ارسال درس‌های روزانه',
            rstart: 'شروع ارسال یادآوری‌ها',
            rend: 'پایان ارسال یادآوری‌ها',
            change: '🔧 تغییر تنظیمات',
            back: '⬅️ بازگشت',
            cancel: 'لغو',
            sendNew: 'لطفاً مقدار جدید را ارسال کنید',
            pause_btn: '⏸ توقف دوره',
            resume_btn: '▶️ ادامهٔ دوره',
            start_specific: '▶️ شروع درس همین حالا …',
        }
        : {
            lang: 'Language',
            tz: 'Timezone',
            day: 'Lesson day',
            ltime: 'Time of sending daily lessons',
            rstart: 'Reminders start time',
            rend: 'Reminders end time',
            change: '🔧 Change settings',
            back: '⬅️ Back',
            cancel: 'Cancel',
            sendNew: 'Please send the new value',
            pause_btn: '⏸ Pause course',
            resume_btn: '▶️ Resume course',
            start_specific: '▶️ Start lesson now …',
        }
}

function settingsSummary(user) {
    const l = labels(user.language)
    return `${l.lang}: ${user.language}\n${l.tz}: ${user.tz}\n${l.day}: ${user.lesson_day}\n${l.ltime}: ${user.lesson_time}\n${l.rstart}: ${user.rep_start}\n${l.rend}: ${user.rep_end}`
}

function getUserLang(ctx) {
    const lc = ctx.from && ctx.from.language_code ? ctx.from.language_code.split('-')[0] : DEFAULT_LANGUAGE
    return lc === 'fa' ? 'fa' : 'en'
}

module.exports = { messages, labels, settingsSummary, getUserLang }