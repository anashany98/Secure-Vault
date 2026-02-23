const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Check if we should use SQLite
const useSQLite = process.env.DB_CLIENT === 'sqlite';

let dbModule;

if (useSQLite) {
    console.log('Using SQLite Database');
    const { Pool } = require('./sqlite_db');
    const sqlitePool = new Pool();
    dbModule = {
        query: (text, params) => sqlitePool.query(text, params),
        pool: sqlitePool,
        connect: (cb) => sqlitePool.connect(cb)
    };
} else {
    // Default to Postgres
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
    });
    dbModule = {
        query: (text, params) => pool.query(text, params),
        pool,
        connect: (cb) => pool.connect(cb)
    };
}

module.exports = dbModule;
