const { DateTime } = require('luxon')
const { SUGGESTION_TO_MINUTES } = require('../config')

function parseHHMM(str, zone) {
    const [h, m] = str.split(':').map(Number)
    return DateTime.now().setZone(zone).set({ hour: h, minute: m, second: 0, millisecond: 0 })
}

function scheduleDateToCron(dt) {
    return `${dt.second} ${dt.minute} ${dt.hour} ${dt.day} ${dt.month} *`
}

function suggestionToTimes(suggestion, start, end) {
    if (start > end) return []
    const times = []

    if (suggestion in SUGGESTION_TO_MINUTES) {
        let cursor = start
        const step = SUGGESTION_TO_MINUTES[suggestion]
        if (!step || typeof step !== 'number' || step <= 0) return []
        while (cursor <= end) {
            times.push(cursor)
            cursor = cursor.plus({ minutes: step })
        }
        return times
    }

    const m = suggestion.match(/(\d+)_times/)
    if (m) {
        const n = Number(m[1])
        if (n === 1) return [start]
        const interval = end.diff(start, 'minutes').minutes / (n - 1)
        for (let i = 0; i < n; i++) times.push(start.plus({ minutes: Math.round(interval * i) }))
        return times
    }
    return []
}

module.exports = { parseHHMM, scheduleDateToCron, suggestionToTimes }