module.exports = async (client) => {
    console.log("Starting Migration V2 (History & Tags)...");

    // 1. Audit Logs Table
    console.log("Creating audit_logs table...");
    await client.query(`
        CREATE TABLE IF NOT EXISTS audit_logs (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            user_id UUID REFERENCES users(id) ON DELETE SET NULL,
            action VARCHAR(50) NOT NULL,
            entity_type VARCHAR(50),
            entity_id UUID,
            details TEXT,
            ip_address VARCHAR(45),
            user_agent TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
    `);

    // 2. Password History Table
    console.log("Creating password_history table...");
    await client.query(`
        CREATE TABLE IF NOT EXISTS password_history (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            vault_item_id UUID REFERENCES vault_items(id) ON DELETE CASCADE,
            encrypted_password TEXT NOT NULL,
            changed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
    `);

    // 3. Update Users Table (Security)
    console.log("Updating users table for security fields...");
    await client.query(`
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS failed_attempts INT DEFAULT 0,
        ADD COLUMN IF NOT EXISTS lockout_until TIMESTAMP WITH TIME ZONE;
    `);

    // 4. Update Vault Items Table (Features)
    console.log("Updating vault_items table for tags and custom fields...");
    await client.query(`
        ALTER TABLE vault_items 
        ADD COLUMN IF NOT EXISTS tags TEXT[],
        ADD COLUMN IF NOT EXISTS custom_fields JSONB;
    `);

    console.log("Migration V2 (Features) Completed Successfully!");
};
