const router = require('express').Router();

const pool = require('../db');
const verifyToken = require('../middleware/auth');

const PASSWORD_REVIEW_WINDOW_DAYS = 7;
const CHECKOUT_ALERT_WINDOW_HOURS = 24;

function createAlert({
    dueAt,
    entityId,
    entityType,
    id,
    message,
    severity,
    title,
    view,
}) {
    return {
        dueAt,
        entityId,
        entityType,
        id,
        message,
        severity,
        title,
        view,
    };
}

function severityRank(value) {
    switch (value) {
        case 'high':
            return 0;
        case 'medium':
            return 1;
        default:
            return 2;
    }
}

router.get('/', verifyToken, async (req, res) => {
    try {
        const now = new Date();
        const reviewCutoff = new Date(now.getTime() + PASSWORD_REVIEW_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();
        const checkoutCutoff = new Date(now.getTime() + CHECKOUT_ALERT_WINDOW_HOURS * 60 * 60 * 1000).toISOString();

        const [passwordReviews, checkoutAlerts, expiringShares] = await Promise.all([
            pool.query(
                `SELECT id, title, next_review_at
                 FROM vault_items
                 WHERE user_id = $1
                   AND is_deleted = false
                   AND next_review_at IS NOT NULL
                   AND next_review_at <= $2`,
                [req.user.id, reviewCutoff]
            ),
            pool.query(
                `SELECT v.id, v.title, v.checked_out_until, holder.name AS holder_name
                 FROM vault_items v
                 LEFT JOIN users holder ON holder.id = v.checked_out_by
                 WHERE v.is_deleted = false
                   AND v.checked_out_by IS NOT NULL
                   AND v.checked_out_until IS NOT NULL
                   AND v.checked_out_until <= $2
                   AND (v.user_id = $1 OR v.checked_out_by = $1)`,
                [req.user.id, checkoutCutoff]
            ),
            pool.query(
                `SELECT s.id, s.expires_at, v.title, u.name AS shared_with_name
                 FROM shares s
                 JOIN vault_items v ON v.id = s.password_id
                 JOIN users u ON u.id = s.shared_with
                 WHERE s.shared_by = $1
                   AND s.expires_at IS NOT NULL
                   AND s.expires_at <= $2`,
                [req.user.id, reviewCutoff]
            ),
        ]);

        const alerts = [
            ...passwordReviews.rows.map((row) =>
                createAlert({
                    dueAt: row.next_review_at,
                    entityId: row.id,
                    entityType: 'password',
                    id: `password-review:${row.id}:${row.next_review_at}`,
                    message: `La credencial ${row.title} debe revisarse antes de ${new Date(row.next_review_at).toLocaleDateString()}.`,
                    severity: new Date(row.next_review_at) <= now ? 'high' : 'medium',
                    title: `Revision pendiente: ${row.title}`,
                    view: 'all',
                })
            ),
            ...checkoutAlerts.rows.map((row) =>
                createAlert({
                    dueAt: row.checked_out_until,
                    entityId: row.id,
                    entityType: 'password',
                    id: `checkout:${row.id}:${row.checked_out_until}`,
                    message: `${row.title} esta reservada por ${row.holder_name || 'otro usuario'} y vence el ${new Date(row.checked_out_until).toLocaleString()}.`,
                    severity: new Date(row.checked_out_until) <= now ? 'high' : 'medium',
                    title: `Checkout por vencer: ${row.title}`,
                    view: 'all',
                })
            ),
            ...expiringShares.rows.map((row) =>
                createAlert({
                    dueAt: row.expires_at,
                    entityId: row.id,
                    entityType: 'share',
                    id: `share:${row.id}:${row.expires_at}`,
                    message: `El acceso compartido de ${row.title} para ${row.shared_with_name} caduca el ${new Date(row.expires_at).toLocaleDateString()}.`,
                    severity: new Date(row.expires_at) <= now ? 'high' : 'medium',
                    title: `Share por vencer: ${row.title}`,
                    view: 'shared',
                })
            ),
        ];

        if (req.user.role === 'admin') {
            const [inventoryReviews, unassignedAssets] = await Promise.all([
                pool.query(
                    `SELECT id, brand, model, serial_number, next_review_at
                     FROM devices
                     WHERE status != 'baja'
                       AND next_review_at IS NOT NULL
                       AND next_review_at <= $1`,
                    [reviewCutoff]
                ),
                pool.query(
                    `SELECT id, brand, model, serial_number
                     FROM devices
                     WHERE status != 'baja'
                       AND (assigned_to IS NULL OR TRIM(assigned_to) = '')`
                ),
            ]);

            alerts.push(
                ...inventoryReviews.rows.map((row) =>
                    createAlert({
                        dueAt: row.next_review_at,
                        entityId: row.id,
                        entityType: 'device',
                        id: `device-review:${row.id}:${row.next_review_at}`,
                        message: `${row.brand} ${row.model} (${row.serial_number || 'sin serie'}) requiere revisión.`,
                        severity: new Date(row.next_review_at) <= now ? 'high' : 'medium',
                        title: `Activo a revisar: ${row.brand} ${row.model}`,
                        view: 'inventory',
                    })
                ),
                ...unassignedAssets.rows.map((row) =>
                    createAlert({
                        dueAt: null,
                        entityId: row.id,
                        entityType: 'device',
                        id: `device-unassigned:${row.id}`,
                        message: `${row.brand} ${row.model} (${row.serial_number || 'sin serie'}) sigue sin asignación.`,
                        severity: 'low',
                        title: `Activo sin asignar: ${row.brand} ${row.model}`,
                        view: 'inventory',
                    })
                )
            );
        }

        alerts.sort((left, right) => {
            const severityDiff = severityRank(left.severity) - severityRank(right.severity);
            if (severityDiff !== 0) {
                return severityDiff;
            }

            const leftTime = left.dueAt ? new Date(left.dueAt).getTime() : Number.MAX_SAFE_INTEGER;
            const rightTime = right.dueAt ? new Date(right.dueAt).getTime() : Number.MAX_SAFE_INTEGER;
            return leftTime - rightTime;
        });

        return res.json(alerts.slice(0, 50));
    } catch (err) {
        console.error(err.message);
        return res.status(500).send('Server Error');
    }
});

module.exports = router;
