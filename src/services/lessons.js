const { Markup } = require('telegraf')
const { DateTime } = require('luxon')
const lessons = require('../../data/lessons.json')
const { messages } = require('../i18n/messages')
const { SUGGESTION_TO_MINUTES, MAX_DAY } = require('../config')
const { updateUser, getUser } = require('../db')
const { suggestionToTimes, parseHHMM } = require('../utils/time')

function calculateEnableLabel(user, lastItem) {
    const M = user.$msg || messages(user.language)
    const suggestion = (lastItem.suggestedRepetition ?? ['every_hour'])[0]
    const start = user.rep_start
    const end = user.rep_end
    const nowInTz = DateTime.now().setZone(user.tz)

    const startDT = parseHHMM(start, user.tz)
    const endDT = parseHHMM(end, user.tz)

    const times = suggestionToTimes(suggestion, startDT, endDT).filter((t) => t > nowInTz)
    const count = times.length

    const everyMinutes = SUGGESTION_TO_MINUTES[suggestion]
    const nTimesMatch = suggestion.match(/(\d+)_times/)
    const nTimes = nTimesMatch ? Number(nTimesMatch[1]) : null

    const preview = everyMinutes
        ? M.preview_every({ everyMinutes, start, end, count })
        : nTimes
            ? M.preview_times({ nTimes, start, end, count })
            : M.preview_generic({ start, end, count })

    const enableLabel = everyMinutes ? M.enable_label_every(everyMinutes) : M.enable_label_times(nTimes || count)

    return { preview, enableLabel }
}

async function sendTodaysLesson(bot, tg_id) {
    const user = { ...getUser(tg_id) }
    if (!user || user.paused) return

    const dayKey = String(user.lesson_day)
    const lessonArr = lessons[dayKey]
    if (!lessonArr) {
        bot.telegram.sendMessage(tg_id, messages(user?.language || 'en').all_done)
        user.paused = 1
        updateUser(user)
        return
    }

    const lang = user.language
    for (const item of lessonArr) {
        const title = item.title[lang] || item.title.en
        const text = item.text[lang] || item.text.en
        const audio = null
        const message = `📜 <b>${title}</b>\n\n${text}`
        await bot.telegram.sendMessage(tg_id, message, { parse_mode: 'HTML' })
        if (audio && audio.length) await bot.telegram.sendAudio(tg_id, audio)
    }

    const lastItem = lessonArr[lessonArr.length - 1]
    const rep = lastItem.repetitionText[lang] || lastItem.repetitionText.en
    const { preview, enableLabel } = calculateEnableLabel({ ...user, $msg: messages(lang) }, lastItem)

    const inline = Markup.inlineKeyboard([
        [Markup.button.callback(enableLabel, `enable_rem_${dayKey}`)],
        [Markup.button.callback(messages(lang).skip_today, `skip_rem_${dayKey}`)],
    ])

    await bot.telegram.sendMessage(tg_id, `💡 ${rep}${preview}`, { parse_mode: 'HTML', reply_markup: inline })

    // Advance day
    user.lesson_day += 1
    if (user.lesson_day > MAX_DAY) {
        user.paused = 1
    }
    updateUser(user)
}

module.exports = { sendTodaysLesson, calculateEnableLabel }