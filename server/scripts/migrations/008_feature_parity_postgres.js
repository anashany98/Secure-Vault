module.exports = async (client) => {
    console.log('Applying Migration V8 (Feature Parity for PostgreSQL)...');

    await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');

    await client.query(`
        ALTER TABLE vault_items
        ADD COLUMN IF NOT EXISTS folder_id TEXT,
        ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE,
        ADD COLUMN IF NOT EXISTS next_review_at TIMESTAMP WITH TIME ZONE,
        ADD COLUMN IF NOT EXISTS renewal_interval_days INTEGER,
        ADD COLUMN IF NOT EXISTS checked_out_by UUID REFERENCES users(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS checked_out_at TIMESTAMP WITH TIME ZONE,
        ADD COLUMN IF NOT EXISTS checked_out_until TIMESTAMP WITH TIME ZONE,
        ADD COLUMN IF NOT EXISTS checkout_note TEXT;
    `);

    await client.query(`
        ALTER TABLE devices
        ADD COLUMN IF NOT EXISTS next_review_at TIMESTAMP WITH TIME ZONE;
    `);

    await client.query(`
        CREATE TABLE IF NOT EXISTS vault_item_attachments (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            vault_item_id UUID NOT NULL REFERENCES vault_items(id) ON DELETE CASCADE,
            file_name VARCHAR(255) NOT NULL,
            mime_type VARCHAR(255),
            size_bytes INTEGER NOT NULL,
            encrypted_data TEXT NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
    `);

    await client.query(`
        CREATE TABLE IF NOT EXISTS vault_templates (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            user_id UUID REFERENCES users(id) ON DELETE CASCADE,
            name VARCHAR(255) NOT NULL,
            title VARCHAR(255) NOT NULL,
            username VARCHAR(255),
            url TEXT,
            meta_person VARCHAR(255),
            renewal_interval_days INTEGER,
            tags TEXT[],
            custom_fields JSONB DEFAULT '[]'::JSONB,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
    `);

    await client.query(`
        CREATE INDEX IF NOT EXISTS idx_vault_item_attachments_vault_item_id
        ON vault_item_attachments(vault_item_id);
    `);
    await client.query(`
        CREATE INDEX IF NOT EXISTS idx_vault_items_next_review_at
        ON vault_items(next_review_at);
    `);
    await client.query(`
        CREATE INDEX IF NOT EXISTS idx_vault_items_checked_out_until
        ON vault_items(checked_out_until);
    `);
    await client.query(`
        CREATE INDEX IF NOT EXISTS idx_devices_next_review_at
        ON devices(next_review_at);
    `);
    await client.query(`
        CREATE INDEX IF NOT EXISTS idx_vault_templates_user_id
        ON vault_templates(user_id);
    `);
    await client.query(`
        CREATE INDEX IF NOT EXISTS idx_device_licenses_device_id
        ON device_licenses(device_id);
    `);
    await client.query(`
        CREATE INDEX IF NOT EXISTS idx_device_licenses_vault_item_id
        ON device_licenses(vault_item_id);
    `);
    await client.query(`
        CREATE INDEX IF NOT EXISTS idx_public_shares_expires_at
        ON public_shares(expires_at);
    `);
    await client.query(`
        CREATE INDEX IF NOT EXISTS idx_employees_status
        ON employees(status);
    `);

    console.log('Migration V8 Applied!');
};
