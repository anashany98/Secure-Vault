module.exports = async (client) => {
    console.log("Starting Migration V5 (Public Shares)...");

    console.log("Creating public_shares table...");
    await client.query(`
        CREATE TABLE IF NOT EXISTS public_shares (
            id VARCHAR(64) PRIMARY KEY,
            data TEXT NOT NULL, -- Encrypted JSON payload
            type VARCHAR(20) DEFAULT 'password', -- 'password' or 'note'
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
            views_left INTEGER DEFAULT 1,
            max_views INTEGER DEFAULT 1
        );
    `);

    console.log("Migration V5 (Public Shares) Completed Successfully!");
};
