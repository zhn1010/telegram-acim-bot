const { Telegraf } = require('telegraf')
const { getSafeUser } = require('../services/users')
const { scheduleJobsForUser, cancelJobsForUser } = require('../services/scheduler')
const { updateUser } = require('../db')

function registerPauseResume(bot /** @type {Telegraf} */) {
    bot.command('pause', (ctx) => {
        const u = getSafeUser(ctx)
        if (!u) return
        u.paused = 1
        updateUser(u)
        cancelJobsForUser(u.tg_id)
        ctx.reply(u.$msg.paused)
    })

    bot.command('resume', (ctx) => {
        const u = getSafeUser(ctx)
        if (!u) return
        u.paused = 0
        updateUser(u)
        scheduleJobsForUser(ctx.telegram, u)
        ctx.reply(u.$msg.resumed)
    })
}

module.exports = { registerPauseResume }