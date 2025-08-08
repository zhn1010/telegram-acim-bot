const { Telegraf, Markup } = require('telegraf')
const tzLookup = require('tz-lookup')
const { IANAZone } = require('luxon')
const { TIME_RE, MAX_DAY } = require('../config')
const { labels, messages, settingsSummary } = require('../i18n/messages')
const { getSafeUser } = require('../services/users')
const { scheduleJobsForUser, cancelJobsForUser } = require('../services/scheduler')
const { updateUser } = require('../db')

// in-memory state for simple waiting flows
const awaitingInput = new Map() // tg_id => field

function registerSettings(bot /** @type {Telegraf} */) {
    bot.command('settings', (ctx) => {
        const u = getSafeUser(ctx)
        if (!u) return
        sendSettingsOverview(ctx, u)
    })

    bot.command('cancel', (ctx) => cancelAwait(ctx))

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
            [Markup.button.callback(l.back, 'close_settings')],
        ])
        ctx.editMessageReplyMarkup(kb.reply_markup).catch(() => { })
    })

    bot.action('toggle_pause', (ctx) => {
        const u = getSafeUser(ctx)
        if (!u) return
        u.paused = u.paused ? 0 : 1
        updateUser(u)

        if (u.paused) {
            cancelJobsForUser(u.tg_id)
            ctx.answerCbQuery(u.$msg.course_paused)
        } else {
            scheduleJobsForUser(ctx.telegram, u)
            ctx.answerCbQuery(u.$msg.course_resumed)
        }
        sendSettingsOverview(ctx, u, false)
    })

    bot.action('close_settings', (ctx) => {
        awaitingInput.delete(ctx.from.id)
        ctx.deleteMessage().catch(() => { })
    })

    // Language via inline
    bot.action('edit_lang', (ctx) => {
        const kb = Markup.inlineKeyboard([
            [Markup.button.callback('English 🇬🇧', 'set_lang_en')],
            [Markup.button.callback('فارسی 🇮🇷', 'set_lang_fa')],
        ])
        ctx.editMessageReplyMarkup(kb.reply_markup).catch(() => { })
    })

    bot.action(/set_lang_(en|fa)/, (ctx) => {
        const lang = ctx.match[1]
        const u = getSafeUser(ctx)
        if (!u) return
        u.language = lang
        updateUser(u)
        ctx.answerCbQuery(messages(lang).settings_updated)
        sendSettingsOverview(ctx, u, false)
    })

    bot.action('edit_tz', (ctx) => {
        const u = getSafeUser(ctx)
        if (!u) return
        const l = labels(u.language)

        const kb = Markup.keyboard([[Markup.button.locationRequest(u.$msg.share_location)], [l.cancel]])
            .oneTime(true)
            .resize(true)

        ctx.reply(`${l.sendNew} (${u.$msg.tz_example})`, kb)
        awaitingInput.set(ctx.from.id, 'tz')
        ctx.answerCbQuery()
    })

        ;['day', 'ltime', 'rstart', 'rend'].forEach((field) => {
            bot.action(`edit_${field}`, (ctx) => {
                const u = getSafeUser(ctx)
                if (!u) return
                const l = labels(u.language)
                const prompt = l.sendNew + (field === 'day' ? u.$msg.number : '')
                ctx.reply(
                    prompt + (field.includes('time') || field.startsWith('r') ? ' HH:mm' : ''),
                    Markup.keyboard([[l.cancel]]).oneTime(true).resize(true)
                )
                awaitingInput.set(ctx.from.id, field)
                ctx.answerCbQuery()
            })
        })

    bot.on('text', (ctx) => {
        const field = awaitingInput.get(ctx.from.id)
        if (!field) return

        const u = getSafeUser(ctx)
        if (!u) return
        const val = ctx.message.text.trim()

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

        updateUser(u)
        scheduleJobsForUser(ctx.telegram, u)
        awaitingInput.delete(ctx.from.id)
        ctx.reply(u.$lbl.change + ' ✅', { reply_markup: { remove_keyboard: true } })
        sendSettingsOverview(ctx, u, false)
    })

    bot.on('location', (ctx) => {
        if (awaitingInput.get(ctx.from.id) !== 'tz') return
        const { latitude, longitude } = ctx.message.location
        let zone
        try {
            zone = tzLookup(latitude, longitude)
        } catch (e) {
            awaitingInput.delete(ctx.from.id)
            return ctx.reply(messages('en').tz_gps_error)
        }

        const u = getSafeUser(ctx)
        if (!u) return
        u.tz = zone
        updateUser(u)

        cancelJobsForUser(u.tg_id)
        scheduleJobsForUser(ctx.telegram, u)
        awaitingInput.delete(ctx.from.id)

        ctx.reply(u.$msg.timezone_set(zone))
        sendSettingsOverview(ctx, u, false)
    })
}

function sendSettingsOverview(ctx, user, showButton = true) {
    const l = labels(user.language)
    const text = settingsSummary(user)
    if (showButton) {
        const kb = Markup.inlineKeyboard([[Markup.button.callback(l.change, 'open_settings')]])
        ctx.reply(text, kb)
    } else ctx.reply(text)
}

function cancelAwait(ctx) {
    awaitingInput.delete(ctx.from.id)
    const u = getSafeUser(ctx)
    if (!u) return
    ctx.reply(u.$msg.cancelled)
}

module.exports = { registerSettings }