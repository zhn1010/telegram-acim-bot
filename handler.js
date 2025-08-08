/* eslint-disable camelcase */
/*
  ACIM Workbook Bot — Node.js (Telegraf v4 + node‑cron + SQLite + tz-lookup)
  -------------------------------------------------------------
  Quick‑start:
    1.  npm i telegraf node-cron better-sqlite3 luxon dotenv tz-lookup bottleneck
    2.  export BOT_TOKEN=<your-telegram-bot-token>
    3.  node acim_bot.js

  This single file keeps the core logic compact.  For production, split it
  into modules (db.js, scheduler.js, handlers/, etc.), add error handling,
  and wire up TLS / reverse‑proxy as needed.
*/

require('dotenv').config()
const Bottleneck = require('bottleneck')
const { Telegraf, Markup } = require('telegraf')
const cron = require('node-cron')
const Database = require('better-sqlite3')
const tzLookup = require('tz-lookup')
const { DateTime, IANAZone } = require('luxon')

// ---------- Config ---------------------------------------------------------
const limiter = new Bottleneck({
  /* 30 msg / sec ⇒ one every 34 ms  */
  reservoir: 30, // how many tokens per interval
  reservoirRefresh: 30,
  reservoirRefreshInterval: 1000,
  minTime: 0 // we use the reservoir, not minTime
})
const BOT_TOKEN = process.env.BOT_TOKEN

if (!BOT_TOKEN) throw new Error('Set BOT_TOKEN env variable')

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/ // HH:mm 24-hour

const ADMIN_IDS = (process.env.ADMIN_IDS || '')
  .split(',')
  .map((s) => Number(s.trim()))
  .filter(Boolean)

const DEFAULT_LANGUAGE = 'en'
const DEFAULT_TIMEZONE = 'Europe/Berlin' // fallback if user skips selection
const DEFAULT_LESSON_TIME = '06:00' // HH:mm, 24‑clock
const DEFAULT_REPEAT_START = '08:00' // HH:mm
const DEFAULT_REPEAT_END = '20:00' // HH:mm
const MAX_DAY = 365

// Map of suggestion string => minutes or count
const SUGGESTION_TO_MINUTES = {
  every_8_minutes: 8,
  every_10_minutes: 10,
  every_12_minutes: 12,
  every_15_minutes: 15,
  every_20_minutes: 20,
  every_30_minutes: 30,
  every_hour: 60
}

// ---------- Messages -------------------------------------------------------

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
      resume_btn: '▶️ ادامهٔ دوره'
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
      resume_btn: '▶️ Resume course'
    }
}

function settingsSummary(user) {
  const l = labels(user.language)
  return `${l.lang}: ${user.language}\n${l.tz}: ${user.tz}\n${l.day}: ${user.lesson_day}\n${l.ltime}: ${user.lesson_time}\n${l.rstart}: ${user.rep_start}\n${l.rend}: ${user.rep_end}`
}

function getUserLang(ctx) {
  const lc = (ctx.from && ctx.from.language_code) ? ctx.from.language_code.split('-')[0] : DEFAULT_LANGUAGE
  return lc === 'fa' ? 'fa' : 'en'
}

// ---------- Database -------------------------------------------------------
const db = new Database('acim_bot.sqlite', { verbose: null })
db.pragma('journal_mode = WAL')
db.exec(`CREATE TABLE IF NOT EXISTS users (
  tg_id            INTEGER PRIMARY KEY,
  language         TEXT    NOT NULL DEFAULT '${DEFAULT_LANGUAGE}',
  tz               TEXT    NOT NULL DEFAULT '${DEFAULT_TIMEZONE}',
  lesson_day       INTEGER NOT NULL DEFAULT 1,
  lesson_time      TEXT    NOT NULL DEFAULT '${DEFAULT_LESSON_TIME}',
  rep_start        TEXT    NOT NULL DEFAULT '${DEFAULT_REPEAT_START}',
  rep_end          TEXT    NOT NULL DEFAULT '${DEFAULT_REPEAT_END}',
  paused           INTEGER NOT NULL DEFAULT 0,
  rem_last_date    TEXT
)`)

db.exec(`CREATE TABLE IF NOT EXISTS reminders (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  tg_id       INTEGER NOT NULL,
  fire_at_utc TEXT    NOT NULL,      -- ISO string (UTC)
  text        TEXT    NOT NULL
)`)

// Prepared statements
const upsertUser = db.prepare(`INSERT INTO users (tg_id) VALUES (?)
  ON CONFLICT(tg_id) DO NOTHING`)
const getUser = db.prepare('SELECT * FROM users WHERE tg_id = ?')

const updateUser = db.prepare(`UPDATE users SET
   language=@language, tz=@tz, lesson_day=@lesson_day, lesson_time=@lesson_time,
   rep_start=@rep_start, rep_end=@rep_end, paused=@paused,
   rem_last_date=@rem_last_date
   WHERE tg_id=@tg_id`)

// ---------- Helpers --------------------------------------------------------
const awaitingInput = new Map() // tg_id ➜ field
function parseHHMM(str, zone) {
  const [h, m] = str.split(':').map(Number)
  return DateTime.now().setZone(zone).set({ hour: h, minute: m, second: 0, millisecond: 0 })
}

function scheduleDateToCron(dt) {
  // node-cron supports 6-field syntax: s m h D M d
  return `${dt.second} ${dt.minute} ${dt.hour} ${dt.day} ${dt.month} *`
}

function suggestionToTimes(suggestion, start, end) {
  if (start > end) return []
  const times = []
  if (suggestion in SUGGESTION_TO_MINUTES) {
    let cursor = start
    const step = SUGGESTION_TO_MINUTES[suggestion]
    if (!step || typeof step !== 'number' || step <= 0) return []
    while (cursor <= end) {
      times.push(cursor)
      cursor = cursor.plus({ minutes: step })
    }
    return times
  }
  // suggestions like '3_times', '4_times' ... evenly spaced
  const m = suggestion.match(/(\d+)_times/)

  if (m) {
    const n = Number(m[1])
    if (n === 1) return [start]
    const interval = end.diff(start, 'minutes').minutes / (n - 1)
    for (let i = 0; i < n; i++) {
      times.push(start.plus({ minutes: Math.round(interval * i) }))
    }
    return times
  }
  return [] // unsupported / empty
}

function getSafeUser(ctx) {
  const u = getUser.get(ctx.from.id)
  if (!u) {
    ctx.reply(messages('en').user_not_found) // fallback to English
    return null
  }
  return {
    ...u,
    $msg: messages(u.language),
    $lbl: labels(u.language)
  }
}

// ---------- Job registry ---------------------------------------------------

function scheduleJobsForUser(bot, user) {
  cancelJobsForUser(user.tg_id) // clear previous jobs, if any

  if (user.paused) return

  // Schedule daily lesson
  const [hour, minute] = user.lesson_time.split(':')
  const cronExp = `${minute} ${hour} * * *`
  const lessonJob = cron.schedule(cronExp, () => sendTodaysLesson(bot, user.tg_id), {
    timezone: user.tz
  })
  trackJob(user.tg_id, lessonJob)
}

// Job registry so we can cancel/update when user changes settings
const jobRegistry = new Map() // tg_id => Set<cronjob>
function trackJob(id, job) {
  if (!jobRegistry.has(id)) jobRegistry.set(id, new Set())
  jobRegistry.get(id).add(job)
}
function cancelJobsForUser(id) {
  if (jobRegistry.has(id)) {
    for (const j of jobRegistry.get(id)) j.stop()
    jobRegistry.delete(id)
  }
}

// ---------- Core Lesson Logic ---------------------------------------------

function calculateEnableLabel(user, lastItem) {
  const M = user.$msg; // already set by getSafeUser

  const suggestion = (lastItem.suggestedRepetition ?? ['every_hour'])[0];
  const start = user.rep_start;
  const end = user.rep_end;
  const nowInTz = DateTime.now().setZone(user.tz);

  const startDT = parseHHMM(start, user.tz);
  const endDT = parseHHMM(end, user.tz);

  const times = suggestionToTimes(suggestion, startDT, endDT)
    .filter(t => t > nowInTz);

  const count = times.length;
  const everyMinutes = SUGGESTION_TO_MINUTES[suggestion];
  const nTimesMatch = suggestion.match(/(\d+)_times/);
  const nTimes = nTimesMatch ? Number(nTimesMatch[1]) : null;

  const preview = everyMinutes
    ? M.preview_every({ everyMinutes, start, end, count })
    : (nTimes
      ? M.preview_times({ nTimes, start, end, count })
      : M.preview_generic({ start, end, count }));

  const enableLabel = everyMinutes
    ? M.enable_label_every(everyMinutes)
    : M.enable_label_times(nTimes || count); // fallback when unknown suggestion

  return {
    preview,
    enableLabel
  }
}

async function sendTodaysLesson(bot, tg_id) {
  const user = { ...getUser.get(tg_id) }
  if (!user || user.paused) return

  const dayKey = String(user.lesson_day)
  const lessonArr = lessons[dayKey]
  if (!lessonArr) {
    // no more lessons
    bot.telegram.sendMessage(tg_id, messages(user?.language || 'en').all_done)
    user.paused = 1
    updateUser.run(user)
    cancelJobsForUser(user.tg_id)
    return
  }

  const lang = user.language
  for (const item of lessonArr) {
    const title = item.title[lang] || item.title.en
    const text = item.text[lang] || item.text.en
    const audio = null // TODO: //item.audioAddress?.[lang] ?? item.audioAddress?.en

    const message = `📜 <b>${title}</b>\n\n${text}`
    await bot.telegram.sendMessage(tg_id, message, { parse_mode: 'HTML' })
    if (audio && audio.length) {
      await bot.telegram.sendAudio(tg_id, audio)
    }
  }
  const lastItem = lessonArr[lessonArr.length - 1]
  const rep = lastItem.repetitionText[lang] || lastItem.repetitionText.en

  const { preview, enableLabel } = calculateEnableLabel(user, lastItem);

  // Prompt for reminders (inline buttons)
  const inline = Markup.inlineKeyboard([
    [Markup.button.callback(enableLabel, `enable_rem_${dayKey}`)],
    [Markup.button.callback(user.$msg.skip_today, `skip_rem_${dayKey}`)]
  ]);

  await bot.telegram.sendMessage(
    tg_id,
    `💡 ${rep}${preview}`,
    { parse_mode: 'HTML', reply_markup: inline }
  );

  // Advance lesson counter for tomorrow
  user.lesson_day += 1
  if (user.lesson_day > MAX_DAY) {
    // finished the workbook – congratulate & pause
    user.paused = 1
    updateUser.run(user)
    cancelJobsForUser(user.tg_id)
  } else {
    updateUser.run(user) // normal progress
  }
}

function scheduleOneShot(bot, user, dt, repText, persist = true) {
  // persist first, so we can recreate after a crash
  let id = null
  if (persist) {
    id = db.prepare('INSERT INTO reminders (tg_id, fire_at_utc, text) VALUES (?,?,?)').run(user.tg_id, dt.toUTC().toISO(), repText).lastInsertRowid
  }
  const cronExp = scheduleDateToCron(dt.setZone(user.tz))
  const job = cron.schedule(
    cronExp,
    async () => {
      try {
        await bot.telegram.sendMessage(user.tg_id, `🔁 ${repText}`, { parse_mode: 'HTML' })
      } finally {
        if (id != null) db.prepare('DELETE FROM reminders WHERE id = ?').run(id)
        job.stop()
        const set = jobRegistry.get(user.tg_id)
        if (set) {
          set.delete(job)
          if (set.size === 0) jobRegistry.delete(user.tg_id) // ← leak fixed
        }
      }
    },
    { timezone: user.tz }
  )

  trackJob(user.tg_id, job)
}

function scheduleRepetitions(bot, user, lessonItem /*, ctx */) {
  const todayISO = DateTime.now().setZone(user.tz).toISODate()
  if (user.rem_last_date === todayISO) return false

  const lang = user.language
  const suggestion = (lessonItem.suggestedRepetition ?? ['every_hour'])[0]

  const start = parseHHMM(user.rep_start, user.tz)
  const end = parseHHMM(user.rep_end, user.tz)
  const times = suggestionToTimes(suggestion, start, end).filter((t) => t > DateTime.now().setZone(user.tz))

  if (times.length === 0) return false // nothing to do

  const repText = lessonItem.repetitionText[lang] || lessonItem.repetitionText.en || ''

  times.forEach((dt) => scheduleOneShot(bot, user, dt, repText))
  user.rem_last_date = todayISO
  updateUser.run(user)
  return true
}

const lessons = require('./lessons.json')

// ---------- Bot Handlers ---------------------------------------------------
const bot = new Telegraf(BOT_TOKEN)

// /start flow ---------------------------------------------------------------

bot.start((ctx) => {
  const id = ctx.from.id
  upsertUser.run(id)
  const lang = getUserLang(ctx) || 'en'
  ctx.reply(messages(lang).welcome)
  ctx.reply(
    messages(lang).choose_language,
    Markup.keyboard([
      ['English 🇬🇧'],
      ['فارسی 🇮🇷']
    ])
      .oneTime(true)
      .resize(true)
  )
})

// Language selection via reply‑keyboard
bot.hears(/English/, (ctx) => setLanguage(ctx, 'en'))
bot.hears(/فارسی/, (ctx) => setLanguage(ctx, 'fa'))
bot.hears(/^\/?cancel$/i, cancelAwait)

function setLanguage(ctx, lang) {
  const u = getSafeUser(ctx)
  if (!u) return
  u.language = lang
  updateUser.run(u)
  scheduleJobsForUser(bot, u)
  ctx.reply(u.$msg.language_set)
  sendSettingsOverview(ctx, u, true) // show summary + change button
}

function sendSettingsOverview(ctx, user, showButton = true) {
  const text = settingsSummary(user)
  const l = labels(user.language)
  if (showButton) {
    const kb = Markup.inlineKeyboard([
      [Markup.button.callback(l.change, 'open_settings')]
    ])
    ctx.reply(text, kb)
  } else ctx.reply(text)
}

// ---------- Settings menu --------------------------------------------------
bot.action('open_settings', (ctx) => {
  const u = getSafeUser(ctx)
  if (!u) return
  const l = labels(u.language)
  const kb = Markup.inlineKeyboard([
    [Markup.button.callback(`🌐 ${l.lang}`, 'edit_lang')],
    [Markup.button.callback(`🌍 ${l.tz}`, 'edit_tz')],
    [Markup.button.callback(`📖 ${l.day}`, 'edit_day')],
    [Markup.button.callback(`⏰ ${l.ltime}`, 'edit_ltime')],
    [Markup.button.callback(`🔁 ${l.rstart}`, 'edit_rstart')],
    [Markup.button.callback(`🔁 ${l.rend}`, 'edit_rend')],
    [Markup.button.callback(u.paused ? l.resume_btn : l.pause_btn, 'toggle_pause')],
    [Markup.button.callback(l.back, 'close_settings')]
  ])
  ctx.editMessageReplyMarkup(kb.reply_markup).catch(() => { })
})

bot.action('toggle_pause', (ctx) => {
  const u = getSafeUser(ctx)
  if (!u) return
  u.paused = u.paused ? 0 : 1
  updateUser.run(u)

  if (u.paused) {
    cancelJobsForUser(u.tg_id)
    ctx.answerCbQuery(u.$msg.course_paused)
  } else {
    scheduleJobsForUser(bot, u)
    ctx.answerCbQuery(u.$msg.course_resumed)
  }

  // Refresh the settings panel so the button text flips
  sendSettingsOverview(ctx, u, false)
})

bot.action('close_settings', (ctx) => {
  awaitingInput.delete(ctx.from.id)
  ctx.deleteMessage().catch(() => { })
})

// --- edit language via inline buttons
bot.action('edit_lang', (ctx) => {
  const kb = Markup.inlineKeyboard([
    [Markup.button.callback('English 🇬🇧', 'set_lang_en')],
    [Markup.button.callback('فارسی 🇮🇷', 'set_lang_fa')]
  ])
  ctx.editMessageReplyMarkup(kb.reply_markup).catch(() => { })
})

bot.action(/set_lang_(en|fa)/, (ctx) => {
  const lang = ctx.match[1]
  const u = getSafeUser(ctx)
  if (!u) return
  u.language = lang
  updateUser.run(u)
  ctx.answerCbQuery(messages(lang).settings_updated)
  sendSettingsOverview(ctx, u, false)
})

bot.action('edit_tz', (ctx) => {
  const u = getSafeUser(ctx)
  if (!u) return
  const l = labels(u.language)

  // For timezone we offer two options: share GPS OR type manually
  const kb = Markup.keyboard([[Markup.button.locationRequest(u.$msg.share_location)], [l.cancel]])
    .oneTime(true)
    .resize(true)

  ctx.reply(
    `${l.sendNew} (${u.$msg.tz_example})`,
    kb
  )

  awaitingInput.set(ctx.from.id, 'tz')
  ctx.answerCbQuery()
})

  // --- edit generic values (tz, day, times)
  ;['day', 'ltime', 'rstart', 'rend'].forEach((field) => {
    bot.action(`edit_${field}`, (ctx) => {
      const u = getSafeUser(ctx)
      if (!u) return
      const l = labels(u.language)

      const prompt = l.sendNew + (field === 'day' ? (u.$msg.number) : '')

      ctx.reply(
        prompt + (field.includes('time') || field.startsWith('r') ? ' HH:mm' : ''),
        Markup.keyboard([[l.cancel]])
          .oneTime(true)
          .resize(true)
      )

      awaitingInput.set(ctx.from.id, field)
      ctx.answerCbQuery()
    })
  })

bot.command('cancel', (ctx) => cancelAwait(ctx))

function cancelAwait(ctx) {
  awaitingInput.delete(ctx.from.id)
  const u = getSafeUser(ctx)
  if (!u) return
  ctx.reply(u.$msg.cancelled)
}

bot.on('text', (ctx) => {
  const field = awaitingInput.get(ctx.from.id)
  if (!field) return // not awaiting anything

  const u = getSafeUser(ctx)
  if (!u) return
  const val = ctx.message.text.trim()

  // Validation
  if (field === 'tz') {
    if (!IANAZone.isValidZone(val)) return ctx.reply(u.$msg.invalid_tz)
    u.tz = val
  } else if (field === 'day') {
    const n = Number(val)
    if (!Number.isInteger(n) || n < 1 || n > MAX_DAY) return ctx.reply(u.$msg.invalid_day_range(MAX_DAY))
    u.lesson_day = n
  } else if (['ltime', 'rstart', 'rend'].includes(field)) {
    if (!TIME_RE.test(val)) return ctx.reply(u.$msg.invalid_time)
    if (field === 'ltime') u.lesson_time = val
    if (field === 'rstart') u.rep_start = val
    if (field === 'rend') u.rep_end = val
  }

  updateUser.run(u)
  scheduleJobsForUser(bot, u)
  awaitingInput.delete(ctx.from.id)
  ctx.reply(u.$lbl.change + ' ✅', { reply_markup: { remove_keyboard: true } })
  sendSettingsOverview(ctx, u, false)
})

bot.on('location', (ctx) => {
  // Only react if we’re actually waiting for a timezone
  if (awaitingInput.get(ctx.from.id) !== 'tz') return

  const { latitude, longitude } = ctx.message.location
  let zone
  try {
    zone = tzLookup(latitude, longitude) // lat/lon ➜ “Asia/Tehran”
  } catch (e) {
    awaitingInput.delete(ctx.from.id)
    return ctx.reply(messages('en').tz_gps_error)
  }

  const u = getSafeUser(ctx)
  if (!u) return
  u.tz = zone
  updateUser.run(u)

  cancelJobsForUser(u.tg_id)
  scheduleJobsForUser(bot, u) // reschedule jobs
  awaitingInput.delete(ctx.from.id)

  ctx.reply(u.$msg.timezone_set(zone))
  sendSettingsOverview(ctx, u, false)
})

// Inline button callbacks
bot.action(/enable_rem_(\d+)/, async (ctx) => {
  const dayKey = ctx.match[1]
  const u = getSafeUser(ctx)
  const lessonItem = lessons[dayKey]?.[lessons[dayKey].length - 1]
  if (!u || !lessonItem) return ctx.answerCbQuery()

  const ok = scheduleRepetitions(bot, u, lessonItem)
  await ctx.answerCbQuery(ok ? u.$msg.reminders_enabled : u.$msg.reminder_failed)
  if (ok) {
    try {
      await ctx.editMessageReplyMarkup()
    } catch (_) { }
  }
})

bot.action(/skip_rem_(\d+)/, (ctx) => {
  const u = getSafeUser(ctx)
  if (!u) return ctx.answerCbQuery()
  return ctx.answerCbQuery(u.$msg.no_reminders)
})

// --- pause/resume ----------------------------------------------------------
bot.command('pause', (ctx) => {
  const u = getSafeUser(ctx)
  if (!u) return
  u.paused = 1
  updateUser.run(u)
  cancelJobsForUser(u.tg_id)
  ctx.reply(u.$msg.paused)
})

bot.command('resume', (ctx) => {
  const u = getSafeUser(ctx)
  if (!u) return
  u.paused = 0
  updateUser.run(u)
  scheduleJobsForUser(bot, u)
  ctx.reply(u.$msg.resumed)
})

// /settings (very minimal — extend as needed)
bot.command('settings', (ctx) => {
  const u = getSafeUser(ctx)
  if (!u) return
  sendSettingsOverview(ctx, u)
})

// /admin broadcast (simple)
bot.command('broadcast', async (ctx) => {
  if (!ADMIN_IDS.includes(ctx.from.id)) return

  const adminUser = getUser.get(ctx.from.id)
  const M = adminUser ? messages(adminUser.language) : messages('en')

  const msg = ctx.message.text.replace(/^\/broadcast\s+/, '').trim()
  if (!msg) return ctx.reply(M.no_msg)

  const users = db.prepare('SELECT tg_id FROM users').all()
  let ok = 0,
    fail = 0

  await Promise.all(
    users.map(({ tg_id }) =>
      limiter
        .schedule(() => bot.telegram.sendMessage(tg_id, `📢 ${msg}`, { parse_mode: 'HTML' }))
        .then(() => ok++)
        .catch(() => fail++)
    )
  )

  ctx.reply(M.broadcast_done(ok, fail))
})

  // ---------- Startup --------------------------------------------------------
  ; (async () => {
    // Re‑schedule all users in DB after restart
    const allUsers = db.prepare('SELECT * FROM users WHERE paused = 0').all()
    for (const u of allUsers) {
      scheduleJobsForUser(bot, u)
    }

    // ---- restore one-shot reminders
    const pending = db.prepare('SELECT id, tg_id, fire_at_utc, text FROM reminders').all()

    for (const r of pending) {
      const user = getUser.get(r.tg_id)
      if (!user) continue // user was deleted
      const dt = DateTime.fromISO(r.fire_at_utc, { zone: 'utc' })
      if (dt < DateTime.utc()) {
        // missed while offline
        db.prepare('DELETE FROM reminders WHERE id = ?').run(r.id)
        continue
      }
      // pass persist=false so we don't reinsert; scheduleOneShot now guards deletes when no id
      scheduleOneShot(bot, user, dt.setZone(user.tz), r.text, false)
    }

    await bot.launch()
    console.log('ACIM bot up & running…')

    // Graceful shutdown
    process.once('SIGINT', () => bot.stop('SIGINT'))
    process.once('SIGTERM', () => bot.stop('SIGTERM'))
  })()
