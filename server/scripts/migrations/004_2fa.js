module.exports = async (client) => {
    console.log("Applying 2FA Schema Changes...");
    await client.query(`
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS two_factor_secret TEXT,
        ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS recovery_codes JSONB DEFAULT '[]'::JSONB;
    `);
};
