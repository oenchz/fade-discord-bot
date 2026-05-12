const Database = require('better-sqlite3');

const db = new Database('./database/bot.db');

db.prepare(`
    CREATE TABLE IF NOT EXISTS staff_stats (
        user_id TEXT PRIMARY KEY,
        reviewed INTEGER DEFAULT 0,
        accepted INTEGER DEFAULT 0,
        denied INTEGER DEFAULT 0,
        closed INTEGER DEFAULT 0,
        locked INTEGER DEFAULT 0,
        unlocked INTEGER DEFAULT 0
    )
`).run();

db.prepare(`
    CREATE TABLE IF NOT EXISTS applications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        username TEXT NOT NULL,
        nickname TEXT NOT NULL,
        age TEXT NOT NULL,
        about TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        curator_id TEXT,
        deny_reason TEXT,
        ticket_channel_id TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
    )
`).run();

function addStaffStat(userId, type) {
    const allowed = ['reviewed', 'accepted', 'denied', 'closed', 'locked', 'unlocked'];
    if (!allowed.includes(type)) return;

    db.prepare(`
        INSERT OR IGNORE INTO staff_stats (user_id)
        VALUES (?)
    `).run(userId);

    db.prepare(`
        UPDATE staff_stats
        SET ${type} = ${type} + 1
        WHERE user_id = ?
    `).run(userId);
}

function getStaffStats() {
    return db.prepare(`
        SELECT *
        FROM staff_stats
        ORDER BY (reviewed + accepted + denied + closed + locked + unlocked) DESC
    `).all();
}

function createApplication(data) {
    const now = Date.now();

    return db.prepare(`
        INSERT INTO applications (
            user_id,
            username,
            nickname,
            age,
            about,
            status,
            ticket_channel_id,
            created_at,
            updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
        data.userId,
        data.username,
        data.nickname,
        data.age,
        data.about,
        'pending',
        data.ticketChannelId,
        now,
        now
    );
}

function updateApplicationStatus(channelId, status, curatorId = null, denyReason = null) {
    db.prepare(`
        UPDATE applications
        SET status = ?,
            curator_id = COALESCE(?, curator_id),
            deny_reason = COALESCE(?, deny_reason),
            updated_at = ?
        WHERE ticket_channel_id = ?
    `).run(status, curatorId, denyReason, Date.now(), channelId);
}

function getApplicationCounts() {
    const rows = db.prepare(`
        SELECT status, COUNT(*) as count
        FROM applications
        GROUP BY status
    `).all();

    const counts = {
        pending: 0,
        review: 0,
        accepted: 0,
        denied: 0,
        total: 0
    };

    for (const row of rows) {
        counts[row.status] = row.count;
        counts.total += row.count;
    }

    return counts;
}

function getRecentApplications(limit = 20) {
    return db.prepare(`
        SELECT *
        FROM applications
        ORDER BY created_at DESC
        LIMIT ?
    `).all(limit);
}

function getApplicationById(id) {
    return db.prepare(`
        SELECT *
        FROM applications
        WHERE id = ?
    `).get(id);
}

module.exports = {
    db,
    addStaffStat,
    getStaffStats,
    createApplication,
    updateApplicationStatus,
    getApplicationCounts,
    getRecentApplications,
    getApplicationById
};