const { Telegraf } = require('telegraf')
const { BOT_TOKEN } = require('./config')

const { registerStart } = require('./handlers/start')
const { registerSettings } = require('./handlers/settings')
const { registerReminders } = require('./handlers/reminders')
const { registerPauseResume } = require('./handlers/pauseResume')
const { registerAdmin } = require('./handlers/admin')

const bot = new Telegraf(BOT_TOKEN)

// Register handlers
registerStart(bot)
registerSettings(bot)
registerReminders(bot)
registerPauseResume(bot)
registerAdmin(bot)

module.exports = { bot }