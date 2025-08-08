// src/handlers/lessonNow.js
const { MAX_DAY } = require('../config')
const { getSafeUser } = require('../services/users')
const { updateUser } = require('../db')
const { sendTodaysLesson } = require('../services/lessons')

function registerLessonNow(bot) {
    bot.command('lesson', async (ctx) => {
        const u = getSafeUser(ctx)
        if (!u) return

        const args = ctx.message.text.split(/\s+/).slice(1)
        const n = Number(args[0])

        if (!Number.isInteger(n) || n < 1 || n > MAX_DAY) {
            return ctx.reply(u.$msg.invalid_day_range(MAX_DAY))
        }

        // Set the day to N so sendTodaysLesson will send lesson N and then advance to N+1
        u.lesson_day = n
        updateUser(u)

        await ctx.reply(u.$msg.starting_lesson(n))
        await sendTodaysLesson(ctx.telegram, u.tg_id)
    })
}

module.exports = { registerLessonNow }
