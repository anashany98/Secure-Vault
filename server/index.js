require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { allowedOrigins } = require('./config');
const enforceCsrf = require('./middleware/csrf');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

const { apiLimiter } = require('./middleware/rateLimiter');
const { ipBlocker } = require('./middleware/ipBlocker');
const { initBackupService } = require('./services/backupService');

// Initialize services
initBackupService();
app.set('trust proxy', 1);

// Initialize SQLite if enabled
if (process.env.DB_CLIENT === 'sqlite') {
    const initSQLite = require('./init_sqlite');
    initSQLite().catch(console.error);
}

// Middleware
app.use(helmet({
    crossOriginOpenerPolicy: { policy: 'same-origin' },
    crossOriginResourcePolicy: { policy: 'same-site' },
    referrerPolicy: { policy: 'no-referrer' },
}));
app.use(cors({
    credentials: true,
    origin(origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            return callback(null, true);
        }

        return callback(new Error('Origin not allowed by CORS'));
    },
}));
app.use(morgan('combined'));
app.use(express.json({ limit: '50mb' }));
app.use(enforceCsrf);
app.use(ipBlocker);
app.use('/api/', apiLimiter);

// Database Pool
if (process.env.DB_CLIENT !== 'sqlite') {
    if (process.env.DATABASE_URL) {
        // Test DB Connection
        db.pool.connect((err, client, release) => {
            if (err) {
                return console.error('Error acquiring client', err.stack);
            }
            console.log('Database connected successfully');
            release();
        });
    } else if (process.env.NODE_ENV !== 'test') {
        console.warn('DATABASE_URL not set, skipping Postgres connection bootstrap');
    }
}

// Routes
// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/vault', require('./routes/vault'));
app.use('/api/notes', require('./routes/notes'));
app.use('/api/groups', require('./routes/groups'));
app.use('/api/inventory', require('./routes/inventory'));
app.use('/api/audit', require('./routes/audit'));
app.use('/api/shares', require('./routes/shares'));
app.use('/api/employees', require('./routes/employees'));
app.use('/api/config', require('./routes/config'));
app.use('/api/templates', require('./routes/templates'));
app.use('/api/alerts', require('./routes/alerts'));

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date() });
});

// Start Server
if (process.env.NODE_ENV !== 'test') {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

// Handle shutdown
process.on('SIGTERM', () => {
    if (process.env.DB_CLIENT !== 'sqlite' && typeof db.pool?.end === 'function') {
        db.pool.end(() => {
            console.log('Pool has ended');
        });
    }
});

module.exports = app;
