require('dotenv').config()
const { DateTime } = require('luxon')
const { bot } = require('./bot')
const { listActiveUsers, getPendingReminders, getUser, deleteReminder } = require('./db')
const { scheduleJobsForUser, scheduleOneShot } = require('./services/scheduler')

    ; (async () => {
        // Re-schedule all users after restart
        const allUsers = listActiveUsers()
        for (const u of allUsers) scheduleJobsForUser(bot.telegram, u)

        // Restore one-shot reminders
        const pending = getPendingReminders()
        for (const r of pending) {
            const user = getUser(r.tg_id)
            if (!user) { deleteReminder(r.id); continue }
            const dt = DateTime.fromISO(r.fire_at_utc, { zone: 'utc' })
            if (dt < DateTime.utc()) { deleteReminder(r.id); continue }
            scheduleOneShot(bot.telegram, user, dt.setZone(user.tz), r.text, false)
        }

        await bot.launch()
        console.log('ACIM bot up & running…')

        process.once('SIGINT', () => bot.stop('SIGINT'))
        process.once('SIGTERM', () => bot.stop('SIGTERM'))
    })()