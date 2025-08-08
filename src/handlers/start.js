const { Markup } = require('telegraf')
const { upsertUser } = require('../db')
const { messages, getUserLang } = require('../i18n/messages')

function registerStart(bot /** @type {Telegraf} */) {
    bot.start((ctx) => {
        upsertUser(ctx.from.id)
        const lang = getUserLang(ctx)
        ctx.reply(messages(lang).welcome)
        ctx.reply(
            messages(lang).choose_language,
            Markup.keyboard([
                ['English 🇬🇧'],
                ['فارسی 🇮🇷'],
            ])
                .oneTime(true)
                .resize(true)
        )
    })

    // Reply-keyboard based language selection
    bot.hears(/English/, (ctx) => ctx.scene?.enter?.('lang:en') || setLanguage(ctx, 'en'))
    bot.hears(/فارسی/, (ctx) => ctx.scene?.enter?.('lang:fa') || setLanguage(ctx, 'fa'))
}

// Lightweight inline impl so we don't need scenes
const { getSafeUser } = require('../services/users')
const { scheduleJobsForUser } = require('../services/scheduler')
const { labels } = require('../i18n/messages')

function setLanguage(ctx, lang) {
    const u = getSafeUser(ctx)
    if (!u) return
    u.language = lang
    if (lang === "fa") {
        u.tz = "Asia/Tehran"
    } else {
        u.tz = "Europe/Berlin"
    }
    const { updateUser } = require('../db')
    updateUser(u)
    scheduleJobsForUser(ctx.telegram, u)
    ctx.reply(messages(lang).language_set)
    sendSettingsOverview(ctx, u, true)
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