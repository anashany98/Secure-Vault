module.exports = async (client) => {
    console.log('Applying Migration V9 (Per-user wrapped vault crypto)...');

    await client.query(`
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS vault_kdf_salt TEXT,
        ADD COLUMN IF NOT EXISTS vault_kdf_iterations INTEGER,
        ADD COLUMN IF NOT EXISTS vault_wrapped_vault_key TEXT,
        ADD COLUMN IF NOT EXISTS vault_wrapped_notes_key TEXT,
        ADD COLUMN IF NOT EXISTS vault_key_verifier TEXT,
        ADD COLUMN IF NOT EXISTS notes_key_verifier TEXT,
        ADD COLUMN IF NOT EXISTS vault_crypto_migrated_at TIMESTAMP WITH TIME ZONE,
        ADD COLUMN IF NOT EXISTS vault_access_scope TEXT;
    `);

    console.log('Migration V9 Applied!');
};
