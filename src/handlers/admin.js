const { ADMIN_IDS, limiter } = require('../config')
const { listAllUsers } = require('../db')
const { messages } = require('../i18n/messages')

function registerAdmin(bot /** @type {Telegraf} */) {
    bot.command('broadcast', async (ctx) => {
        if (!ADMIN_IDS.includes(ctx.from.id)) return

        // Pick message language from the admin doing the broadcast if we can
        const adminLang = (ctx.from.language_code || 'en').split('-')[0] === 'fa' ? 'fa' : 'en'
        const M = messages(adminLang)

        const msg = ctx.message.text.replace(/^\/broadcast\s+/, '').trim()
        if (!msg) return ctx.reply(M.no_msg)

        const users = listAllUsers()
        let ok = 0, fail = 0

        await Promise.all(
            users.map(({ tg_id }) =>
                limiter
                    .schedule(() => ctx.telegram.sendMessage(tg_id, `📢 ${msg}`, { parse_mode: 'HTML' }))
                    .then(() => ok++)
                    .catch(() => fail++)
            )
        )

        ctx.reply(M.broadcast_done(ok, fail))
    })
}

module.exports = { registerAdmin }