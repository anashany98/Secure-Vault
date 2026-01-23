const pool = require('../db');

const auditLog = async (userId, action, entityType, entityId, details, req) => {
    try {
        const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        const userAgent = req.headers['user-agent'];

        // If DB is not migrated, this will fail gracefully or we can check existence
        // For now, we wrap in try/catch to avoid crashing the app if DB is outdated
        await pool.query(
            `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address, user_agent)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [userId, action, entityType, entityId, details, ipAddress, userAgent]
        );
    } catch (err) {
        console.error("Audit Log Error:", err.message);
        // Do not convert to app error, just log failure (fail-open vs fail-closed decision - fail-open for availability)
    }
};

module.exports = auditLog;
