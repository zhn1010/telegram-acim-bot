const { messages, labels } = require('../i18n/messages')
const { getUser } = require('../db')

function getSafeUser(ctx) {
    const u = getUser(ctx.from.id)
    if (!u) {
        ctx.reply(messages('en').user_not_found)
        return null
    }
    return { ...u, $msg: messages(u.language), $lbl: labels(u.language) }
}

module.exports = { getSafeUser }