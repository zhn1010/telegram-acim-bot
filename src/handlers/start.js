const { Markup } = require('telegraf')
const { upsertUser, getUser, updateUser } = require('../db')
const { messages, getUserLang, labels } = require('../i18n/messages')
const { getSafeUser } = require('../services/users')
const { scheduleJobsForUser } = require('../services/scheduler')
const { sendTodaysLesson } = require('../services/lessons')
const { DateTime } = require('luxon')
const { parseHHMM } = require('../utils/time')
const { setCommandsForUser } = require('../utils/commands')

// Track truly new users just for this session (no DB change needed)
const newUsers = new Set()

function registerStart(bot /** @type {Telegraf} */) {
    bot.start((ctx) => {
        const exists = !!getUser(ctx.from.id)
        if (!exists) {
            upsertUser(ctx.from.id)
            newUsers.add(ctx.from.id)
        }
        const lang = getUserLang(ctx)
        ctx.reply(messages(lang).welcome)
        ctx.reply(
            messages(lang).choose_language,
            Markup.keyboard([['English 🇬🇧'], ['فارسی 🇮🇷']]).oneTime(true).resize(true)
        )
    })

    bot.hears(/English/, (ctx) => setLanguage(ctx, 'en'))
    bot.hears(/فارسی/, (ctx) => setLanguage(ctx, 'fa'))

    // First-run actions
    bot.action('first_start_now', async (ctx) => {
        const u = getSafeUser(ctx)
        if (!u) return
        await ctx.answerCbQuery()
        // ensure they begin at day 1
        if (u.lesson_day !== 1) {
            u.lesson_day = 1
            updateUser(u)
        }
        await ctx.reply(u.$msg.first_started)
        await sendTodaysLesson(ctx.telegram, u.tg_id)
    })

    bot.action('first_wait', async (ctx) => {
        const u = getSafeUser(ctx)
        if (!u) return
        await ctx.answerCbQuery()
        await ctx.reply(u.$msg.first_scheduled_today(u.lesson_time))
    })
}

async function setLanguage(ctx, lang) {
    const u = getSafeUser(ctx)
    if (!u) return
    u.language = lang
    updateUser(u)
    await setCommandsForUser(ctx.telegram, u) // hides /start for this user
    scheduleJobsForUser(ctx.telegram, u)
    ctx.reply(messages(lang).language_set)
    sendSettingsOverview(ctx, u, true)

    // Offer immediate start only for brand new users AND only if the daily time has already passed.
    if (newUsers.has(ctx.from.id)) {
        newUsers.delete(ctx.from.id)
        maybeOfferImmediateStart(ctx, u)
    }
}

function maybeOfferImmediateStart(ctx, user) {
    const M = messages(user.language)
    const now = DateTime.now().setZone(user.tz)
    const lessonToday = parseHHMM(user.lesson_time, user.tz)

    // Only offer "Start now" if the scheduled time for today has already passed,
    // otherwise they'd get two lessons today (now and again at lesson_time).
    if (now >= lessonToday) {
        const kb = Markup.inlineKeyboard([
            [Markup.button.callback(M.first_start_now, 'first_start_now')],
            [Markup.button.callback(M.first_wait_tomorrow(user.lesson_time), 'first_wait')],
        ])
        ctx.reply(M.first_prompt, kb)
    } else {
        // It's before lesson_time today — just confirm the upcoming send.
        ctx.reply(M.first_scheduled_today(user.lesson_time))
    }
}

function sendSettingsOverview(ctx, user, showButton = true) {
    const { settingsSummary } = require('../i18n/messages')
    const l = labels(user.language)
    const text = settingsSummary(user)
    if (showButton) {
        const kb = Markup.inlineKeyboard([[Markup.button.callback(l.change, 'open_settings')]])
        ctx.reply(text, kb)
    } else {
        ctx.reply(text)
    }
}

module.exports = { registerStart }
