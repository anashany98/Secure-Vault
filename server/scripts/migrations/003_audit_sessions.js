module.exports = async (client) => {
    console.log("Starting Migration V3 (Audit JSONB & Sessions)...");

    // 1. Convert audit_logs.details from TEXT to JSONB
    console.log("Converting audit_logs.details to JSONB...");
    await client.query(`
        ALTER TABLE audit_logs 
        ALTER COLUMN details TYPE JSONB USING 
        CASE 
            WHEN details IS NULL OR details = '' THEN '{}'::JSONB
            ELSE details::JSONB 
        END;
    `);

    // 2. Create sessions table
    console.log("Creating sessions table...");
    await client.query(`
        CREATE TABLE IF NOT EXISTS sessions (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            user_id UUID REFERENCES users(id) ON DELETE CASCADE,
            token_hash TEXT UNIQUE NOT NULL,
            ip_address VARCHAR(45),
            user_agent TEXT,
            last_active TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
            is_revoked BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
    `);

    console.log("Creating index on sessions.user_id...");
    await client.query('CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);');

    console.log("Migration V3 (Advanced Features) Completed Successfully!");
};
