const {
    DEFAULT_LANGUAGE,
} = require('../config')

function messages(lang) {
    return lang === 'fa'
        ? {
            welcome: 'به ربات درس‌های دوره ACIM خوش آمدید. لطفاً زبان را انتخاب کنید',
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
        }
        : {
            welcome: 'Welcome to the ACIM Workbook Bot.\nPlease choose your language:',
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
        }
}

function labels(lang) {
    return lang === 'fa'
        ? {
            lang: 'زبان',
            tz: 'منطقه‌زمانی',
            day: 'روز درس',
            ltime: 'ساعت درس',
            rstart: 'شروع تکرار',
            rend: 'پایان تکرار',
            change: '🔧 تغییر تنظیمات',
            back: '⬅️ بازگشت',
            cancel: 'لغو',
            sendNew: 'لطفاً مقدار جدید را ارسال کنید',
            pause_btn: '⏸ توقف دوره',
            resume_btn: '▶️ ادامهٔ دوره',
        }
        : {
            lang: 'Language',
            tz: 'Timezone',
            day: 'Lesson day',
            ltime: 'Lesson time',
            rstart: 'Repeat start',
            rend: 'Repeat end',
            change: '🔧 Change settings',
            back: '⬅️ Back',
            cancel: 'Cancel',
            sendNew: 'Please send the new value',
            pause_btn: '⏸ Pause course',
            resume_btn: '▶️ Resume course',
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