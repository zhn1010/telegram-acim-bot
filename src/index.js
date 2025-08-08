require('dotenv').config()
const { DateTime } = require('luxon')
const { bot } = require('./bot')
const { listActiveUsers, listAllUsersFull, getPendingReminders, getUser, deleteReminder } = require('./db')
const { scheduleJobsForUser, scheduleOneShot } = require('./services/scheduler')
const { setCommandsForUser } = require('./utils/commands')

async function setDefaultCommands() {
    await bot.telegram.setMyCommands([
        { command: 'start', description: 'Start the bot' },
        { command: 'settings', description: 'Open settings' },
    ])
    await bot.telegram.setMyCommands(
        [
            { command: 'start', description: 'شروع ربات' },
            { command: 'settings', description: 'تنظیمات' },
        ],
        { language_code: 'fa' }
    )
}

; (async () => {
    // 1) Defaults first
    await setDefaultCommands()

    // 2) Per-chat menus for everyone (so paused users get /resume etc.)
    const allUsers = listAllUsersFull()
    for (const u of allUsers) {
        await setCommandsForUser(bot.telegram, u)
    }

    // 3) Schedule only active users
    const active = listActiveUsers()
    for (const u of active) {
        scheduleJobsForUser(bot.telegram, u)
    }

    // 4) Restore one-shot reminders
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
