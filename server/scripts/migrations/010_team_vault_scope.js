module.exports = async (client) => {
    console.log('Applying Migration V10 (Team vault scope and invitations)...');

    await client.query(`
        ALTER TABLE vault_items
        ADD COLUMN IF NOT EXISTS crypto_scope TEXT DEFAULT 'user';
    `);

    await client.query(`
        ALTER TABLE notes
        ADD COLUMN IF NOT EXISTS crypto_scope TEXT DEFAULT 'user';
    `);

    await client.query(`
        UPDATE vault_items
        SET crypto_scope = 'user'
        WHERE crypto_scope IS NULL;
    `);

    await client.query(`
        UPDATE notes
        SET crypto_scope = 'user'
        WHERE crypto_scope IS NULL;
    `);

    await client.query(`
        CREATE TABLE IF NOT EXISTS team_vault_invitations (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            created_by UUID REFERENCES users(id) ON DELETE SET NULL,
            encrypted_vault_key TEXT NOT NULL,
            encrypted_notes_key TEXT NOT NULL,
            encrypted_verifier TEXT NOT NULL,
            expires_at TIMESTAMP WITH TIME ZONE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id)
        );
    `);

    await client.query(`
        CREATE INDEX IF NOT EXISTS idx_vault_items_crypto_scope ON vault_items(crypto_scope);
    `);

    await client.query(`
        CREATE INDEX IF NOT EXISTS idx_notes_crypto_scope ON notes(crypto_scope);
    `);

    await client.query(`
        CREATE INDEX IF NOT EXISTS idx_team_vault_invitations_user_id ON team_vault_invitations(user_id);
    `);

    console.log('Migration V10 Applied!');
};
