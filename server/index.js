require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

const { apiLimiter } = require('./middleware/rateLimiter');
const { ipBlocker } = require('./middleware/ipBlocker');
const { initBackupService } = require('./services/backupService');

// Initialize services
initBackupService();

// Initialize SQLite if enabled
if (process.env.DB_CLIENT === 'sqlite') {
    const initSQLite = require('./init_sqlite');
    initSQLite().catch(console.error);
}

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());
app.use(ipBlocker);
app.use('/api/', apiLimiter);

// Database Pool
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

// Test DB Connection
pool.connect((err, client, release) => {
    if (err) {
        return console.error('Error acquiring client', err.stack);
    }
    console.log('Database connected successfully');
    release();
});

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
    pool.end(() => {
        console.log('Pool has ended');
    });
});

module.exports = app;
