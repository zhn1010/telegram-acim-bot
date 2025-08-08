const { Telegraf } = require('telegraf')
const lessons = require('../../data/lessons.json')
const { getSafeUser } = require('../services/users')
const { scheduleRepetitions } = require('../services/scheduler')

function registerReminders(bot /** @type {Telegraf} */) {
    bot.action(/enable_rem_(\d+)/, async (ctx) => {
        const dayKey = ctx.match[1]
        const u = getSafeUser(ctx)
        const lessonItem = lessons[dayKey]?.[lessons[dayKey].length - 1]
        if (!u || !lessonItem) return ctx.answerCbQuery()

        const ok = scheduleRepetitions(ctx.telegram, u, lessonItem)
        await ctx.answerCbQuery(ok ? u.$msg.reminders_enabled : u.$msg.reminder_failed)
        if (ok) {
            try { await ctx.editMessageReplyMarkup() } catch (_) { }
        }
    })

    bot.action(/skip_rem_(\d+)/, (ctx) => {
        const u = getSafeUser(ctx)
        if (!u) return ctx.answerCbQuery()
        return ctx.answerCbQuery(u.$msg.no_reminders)
    })
}

module.exports = { registerReminders }