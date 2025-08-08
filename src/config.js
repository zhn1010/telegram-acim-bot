require('dotenv').config()

const Bottleneck = require('bottleneck')

const BOT_TOKEN = process.env.BOT_TOKEN
if (!BOT_TOKEN) throw new Error('Set BOT_TOKEN in .env')

const ADMIN_IDS = (process.env.ADMIN_IDS || '')
    .split(',')
    .map((s) => Number(s.trim()))
    .filter(Boolean)

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/ // HH:mm 24-hour

const DEFAULT_LANGUAGE = 'en'
const DEFAULT_TIMEZONE = 'Europe/Berlin'
const DEFAULT_LESSON_TIME = '06:00'
const DEFAULT_REPEAT_START = '08:00'
const DEFAULT_REPEAT_END = '20:00'
const MAX_DAY = 365

const SUGGESTION_TO_MINUTES = {
    every_8_minutes: 8,
    every_10_minutes: 10,
    every_12_minutes: 12,
    every_15_minutes: 15,
    every_20_minutes: 20,
    every_30_minutes: 30,
    every_hour: 60
}

// Rate limiter (used for /broadcast)
const limiter = new Bottleneck({
    reservoir: 30,
    reservoirRefresh: 30,
    reservoirRefreshInterval: 1000,
    minTime: 0,
})

module.exports = {
    BOT_TOKEN,
    ADMIN_IDS,
    limiter,
    TIME_RE,
    DEFAULT_LANGUAGE,
    DEFAULT_TIMEZONE,
    DEFAULT_LESSON_TIME,
    DEFAULT_REPEAT_START,
    DEFAULT_REPEAT_END,
    MAX_DAY,
    SUGGESTION_TO_MINUTES,
}