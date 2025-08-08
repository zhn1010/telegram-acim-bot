const Database = require('better-sqlite3')
const {
    DEFAULT_LANGUAGE,
    DEFAULT_TIMEZONE,
    DEFAULT_LESSON_TIME,
    DEFAULT_REPEAT_START,
    DEFAULT_REPEAT_END,
} = require('../config')

const db = new Database('acim_bot.sqlite', { verbose: null })
db.pragma('journal_mode = WAL')

// Schema

db.exec(`CREATE TABLE IF NOT EXISTS users (
  tg_id            INTEGER PRIMARY KEY,
  language         TEXT    NOT NULL DEFAULT '${DEFAULT_LANGUAGE}',
  tz               TEXT    NOT NULL DEFAULT '${DEFAULT_TIMEZONE}',
  lesson_day       INTEGER NOT NULL DEFAULT 1,
  lesson_time      TEXT    NOT NULL DEFAULT '${DEFAULT_LESSON_TIME}',
  rep_start        TEXT    NOT NULL DEFAULT '${DEFAULT_REPEAT_START}',
  rep_end          TEXT    NOT NULL DEFAULT '${DEFAULT_REPEAT_END}',
  paused           INTEGER NOT NULL DEFAULT 0,
  rem_last_date    TEXT
)`)

db.exec(`CREATE TABLE IF NOT EXISTS reminders (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  tg_id       INTEGER NOT NULL,
  fire_at_utc TEXT    NOT NULL,
  text        TEXT    NOT NULL
)`)

// Users
function upsertUser(tg_id) {
    db.prepare(`INSERT INTO users (tg_id) VALUES (?) ON CONFLICT(tg_id) DO NOTHING`).run(tg_id)
}
function getUser(tg_id) {
    return db.prepare('SELECT * FROM users WHERE tg_id = ?').get(tg_id)
}
function updateUser(user) {
    return db.prepare(`UPDATE users SET
    language=@language, tz=@tz, lesson_day=@lesson_day, lesson_time=@lesson_time,
    rep_start=@rep_start, rep_end=@rep_end, paused=@paused, rem_last_date=@rem_last_date
    WHERE tg_id=@tg_id`).run(user)
}
function listAllUsers() {
    return db.prepare('SELECT tg_id FROM users').all()
}
function listActiveUsers() {
    return db.prepare('SELECT * FROM users WHERE paused = 0').all()
}

// Reminders
function insertReminder(tg_id, fire_at_utc, text) {
    const info = db.prepare('INSERT INTO reminders (tg_id, fire_at_utc, text) VALUES (?,?,?)')
        .run(tg_id, fire_at_utc, text)
    return info.lastInsertRowid
}
function deleteReminder(id) {
    db.prepare('DELETE FROM reminders WHERE id = ?').run(id)
}
function getPendingReminders() {
    return db.prepare('SELECT id, tg_id, fire_at_utc, text FROM reminders').all()
}

function listAllUsersFull() {
    return db.prepare('SELECT * FROM users').all()
}

module.exports = {
    db,
    upsertUser,
    getUser,
    updateUser,
    listAllUsers,
    listActiveUsers,
    insertReminder,
    deleteReminder,
    getPendingReminders,
    listAllUsersFull,
}