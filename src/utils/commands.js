// Build the right menu for ONE chat, then set it via chat-scoped commands
const { ADMIN_IDS } = require('../config')

function buildCommandsForUser(user) {
    const lang = user.language === 'fa' ? 'fa' : 'en'
    const t = (en, fa) => (lang === 'fa' ? fa : en)

    const cmds = [
        // don't include /start here; default scope will show it for new users
        { command: 'settings', description: t('Open settings', 'تنظیمات') },
        { command: 'lesson', description: t('Start a specific lesson now (/lesson 23)', 'شروع یک درس مشخص (/lesson 23)') },
    ]

    if (user.paused) {
        cmds.push({ command: 'resume', description: t('Resume the course', 'ادامهٔ دوره') })
    } else {
        cmds.push({ command: 'pause', description: t('Pause the course', 'توقف دوره') })
    }

    // Optional help
    // cmds.push({ command: 'help', description: t('Show help', 'راهنما') })

    if (ADMIN_IDS.includes(Number(user.tg_id))) {
        cmds.push({ command: 'broadcast', description: t('Broadcast to all users', 'ارسال پیام جمعی') })
    }
    return cmds
}

/**
 * Set per-chat command list for this user (overrides default in *their* DM)
 * @param {import('telegraf').Telegram} tg
 * @param {object} user - row from DB with tg_id, language, paused, ...
 */
async function setCommandsForUser(tg, user) {
    const cmds = buildCommandsForUser(user)
    await tg.setMyCommands(cmds, {
        scope: { type: 'chat', chat_id: user.tg_id },
        // you can omit language_code here; descriptions already match user.language
    })
}

module.exports = { setCommandsForUser, buildCommandsForUser }
