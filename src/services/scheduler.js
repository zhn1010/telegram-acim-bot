const cron = require('node-cron')
const { DateTime } = require('luxon')
const { scheduleDateToCron, parseHHMM, suggestionToTimes } = require('../utils/time')
const { insertReminder, deleteReminder, updateUser } = require('../db')
const { sendTodaysLesson } = require('./lessons')

// tg_id => Set<cronjob>
const jobRegistry = new Map()

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

function scheduleJobsForUser(tg, user) {
    cancelJobsForUser(user.tg_id)
    if (user.paused) return

    const [hour, minute] = user.lesson_time.split(':')
    const cronExp = `${minute} ${hour} * * *`
    const lessonJob = cron.schedule(cronExp, () => sendTodaysLesson(tg, user.tg_id), { timezone: user.tz })
    trackJob(user.tg_id, lessonJob)
}

function scheduleOneShot(tg, user, dt, repText, persist = true) {
    let id = null
    if (persist) id = insertReminder(user.tg_id, dt.toUTC().toISO(), repText)

    const cronExp = scheduleDateToCron(dt.setZone(user.tz))
    const job = cron.schedule(
        cronExp,
        async () => {
            try {
                await tg.sendMessage(user.tg_id, `🔁 ${repText}`, { parse_mode: 'HTML' })
            } finally {
                if (id != null) deleteReminder(id)
                job.stop()
                const set = jobRegistry.get(user.tg_id)
                if (set) {
                    set.delete(job)
                    if (set.size === 0) jobRegistry.delete(user.tg_id)
                }
            }
        },
        { timezone: user.tz }
    )
    trackJob(user.tg_id, job)
}

function scheduleRepetitions(tg, user, lessonItem) {
    const todayISO = DateTime.now().setZone(user.tz).toISODate()
    if (user.rem_last_date === todayISO) return false

    const lang = user.language
    const suggestion = (lessonItem.suggestedRepetition ?? ['every_hour'])[0]

    const start = parseHHMM(user.rep_start, user.tz)
    const end = parseHHMM(user.rep_end, user.tz)
    const times = suggestionToTimes(suggestion, start, end).filter((t) => t > DateTime.now().setZone(user.tz))
    if (times.length === 0) return false

    const repText = lessonItem.repetitionText[lang] || lessonItem.repetitionText.en || ''
    times.forEach((dt) => scheduleOneShot(tg, user, dt, repText))

    user.rem_last_date = todayISO
    updateUser(user)
    return true
}

module.exports = {
    scheduleJobsForUser,
    cancelJobsForUser,
    scheduleOneShot,
    scheduleRepetitions,
}