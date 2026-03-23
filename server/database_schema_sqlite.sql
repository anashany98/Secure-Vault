-- SQLite Schema for Secure Vault

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY DEFAULT (uuid_generate_v4()),
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'user',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    failed_attempts INTEGER DEFAULT 0,
    lockout_until DATETIME,
    two_factor_enabled BOOLEAN DEFAULT 0,
    two_factor_secret TEXT,
    recovery_codes TEXT, -- Stored as JSON string
    vault_kdf_salt TEXT,
    vault_kdf_iterations INTEGER,
    vault_wrapped_vault_key TEXT,
    vault_wrapped_notes_key TEXT,
    vault_key_verifier TEXT,
    notes_key_verifier TEXT,
    vault_crypto_migrated_at DATETIME,
    vault_access_scope TEXT
);

-- 2. PASSWORDS VAULT TABLE
CREATE TABLE IF NOT EXISTS vault_items (
    id TEXT PRIMARY KEY DEFAULT (uuid_generate_v4()),
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    username TEXT,
    encrypted_password TEXT NOT NULL,
    crypto_scope TEXT DEFAULT 'user',
    url TEXT,
    meta_person TEXT,
    folder_id TEXT,
    is_favorite BOOLEAN DEFAULT 0,
    is_deleted BOOLEAN DEFAULT 0,
    deleted_at DATETIME,
    next_review_at DATETIME,
    renewal_interval_days INTEGER,
    checked_out_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    checked_out_at DATETIME,
    checked_out_until DATETIME,
    checkout_note TEXT,
    tags TEXT, -- JSON array
    custom_fields TEXT, -- JSON array
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS vault_item_attachments (
    id TEXT PRIMARY KEY DEFAULT (uuid_generate_v4()),
    vault_item_id TEXT NOT NULL REFERENCES vault_items(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    mime_type TEXT,
    size_bytes INTEGER NOT NULL,
    encrypted_data TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 3. INVENTORY DEVICES TABLE
CREATE TABLE IF NOT EXISTS devices (
    id TEXT PRIMARY KEY DEFAULT (uuid_generate_v4()),
    type TEXT NOT NULL,
    brand TEXT NOT NULL,
    model TEXT NOT NULL,
    serial_number TEXT,
    status TEXT DEFAULT 'stock',
    assigned_to TEXT,
    location TEXT,
    purchase_date TEXT, -- Store dates as ISO strings
    next_review_at DATETIME,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 4. DEVICE HISTORY TABLE
CREATE TABLE IF NOT EXISTS device_history (
    id TEXT PRIMARY KEY DEFAULT (uuid_generate_v4()),
    device_id TEXT REFERENCES devices(id) ON DELETE CASCADE,
    performed_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    event_type TEXT NOT NULL,
    description TEXT,
    event_date DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 5. SECURE NOTES TABLE
CREATE TABLE IF NOT EXISTS notes (
    id TEXT PRIMARY KEY DEFAULT (uuid_generate_v4()),
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    crypto_scope TEXT DEFAULT 'user',
    is_favorite BOOLEAN DEFAULT 0,
    is_deleted BOOLEAN DEFAULT 0,
    deleted_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 6. EMPLOYEES TABLE
CREATE TABLE IF NOT EXISTS employees (
    id TEXT PRIMARY KEY DEFAULT (uuid_generate_v4()),
    full_name TEXT NOT NULL,
    email TEXT,
    department TEXT,
    job_title TEXT,
    status TEXT DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 7. APP CONFIG TABLE
CREATE TABLE IF NOT EXISTS app_config (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS password_history (
    id TEXT PRIMARY KEY DEFAULT (uuid_generate_v4()),
    vault_item_id TEXT NOT NULL REFERENCES vault_items(id) ON DELETE CASCADE,
    encrypted_password TEXT NOT NULL,
    changed_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO app_config (key, value)
VALUES ('company_name', 'Mi Empresa')
ON CONFLICT(key) DO NOTHING;

-- 8. GROUPS TABLE
CREATE TABLE IF NOT EXISTS groups (
    id TEXT PRIMARY KEY DEFAULT (uuid_generate_v4()),
    name TEXT NOT NULL,
    description TEXT,
    created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 9. GROUP MEMBERS TABLE
CREATE TABLE IF NOT EXISTS group_members (
    id TEXT PRIMARY KEY DEFAULT (uuid_generate_v4()),
    group_id TEXT REFERENCES groups(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member',
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(group_id, user_id)
);

CREATE TABLE IF NOT EXISTS vault_templates (
    id TEXT PRIMARY KEY DEFAULT (uuid_generate_v4()),
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    title TEXT NOT NULL,
    username TEXT,
    url TEXT,
    meta_person TEXT,
    renewal_interval_days INTEGER,
    tags TEXT,
    custom_fields TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS device_licenses (
    id TEXT PRIMARY KEY DEFAULT (uuid_generate_v4()),
    device_id TEXT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    vault_item_id TEXT NOT NULL REFERENCES vault_items(id) ON DELETE CASCADE,
    assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(device_id, vault_item_id)
);

-- 10. SHARES TABLE
CREATE TABLE IF NOT EXISTS shares (
    id TEXT PRIMARY KEY DEFAULT (uuid_generate_v4()),
    password_id TEXT REFERENCES vault_items(id) ON DELETE CASCADE,
    shared_by TEXT REFERENCES users(id) ON DELETE CASCADE,
    shared_with TEXT REFERENCES users(id) ON DELETE CASCADE,
    permission TEXT DEFAULT 'read',
    expires_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 10B. PUBLIC SHARES TABLE
CREATE TABLE IF NOT EXISTS public_shares (
    id TEXT PRIMARY KEY,
    data TEXT NOT NULL,
    type TEXT DEFAULT 'password',
    expires_at DATETIME NOT NULL,
    views_left INTEGER DEFAULT 1,
    max_views INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS team_vault_invitations (
    id TEXT PRIMARY KEY DEFAULT (uuid_generate_v4()),
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    encrypted_vault_key TEXT NOT NULL,
    encrypted_notes_key TEXT NOT NULL,
    encrypted_verifier TEXT NOT NULL,
    expires_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- 11. SESSIONS TABLE (Added from observation of auth.js usage)
CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT,
    ip_address TEXT,
    user_agent TEXT,
    is_revoked BOOLEAN DEFAULT 0,
    expires_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_active DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 12. AUDIT LOGS TABLE (Added from auditLogger.js observation)
CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY DEFAULT (uuid_generate_v4()),
    user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT,
    entity_id TEXT,
    details TEXT,
    ip_address TEXT,
    user_agent TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_vault_items_user_id ON vault_items(user_id);
CREATE INDEX IF NOT EXISTS idx_vault_items_crypto_scope ON vault_items(crypto_scope);
CREATE INDEX IF NOT EXISTS idx_vault_items_title ON vault_items(title);
CREATE INDEX IF NOT EXISTS idx_vault_items_next_review_at ON vault_items(next_review_at);
CREATE INDEX IF NOT EXISTS idx_vault_items_checked_out_until ON vault_items(checked_out_until);
CREATE INDEX IF NOT EXISTS idx_vault_item_attachments_vault_item_id ON vault_item_attachments(vault_item_id);
CREATE INDEX IF NOT EXISTS idx_devices_status ON devices(status);
CREATE INDEX IF NOT EXISTS idx_devices_assigned_to ON devices(assigned_to);
CREATE INDEX IF NOT EXISTS idx_devices_next_review_at ON devices(next_review_at);
CREATE INDEX IF NOT EXISTS idx_notes_user_id ON notes(user_id);
CREATE INDEX IF NOT EXISTS idx_notes_crypto_scope ON notes(crypto_scope);
CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(status);
CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_vault_templates_user_id ON vault_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_device_licenses_device_id ON device_licenses(device_id);
CREATE INDEX IF NOT EXISTS idx_device_licenses_vault_item_id ON device_licenses(vault_item_id);
CREATE INDEX IF NOT EXISTS idx_shares_shared_with ON shares(shared_with);
CREATE INDEX IF NOT EXISTS idx_public_shares_expires_at ON public_shares(expires_at);
CREATE INDEX IF NOT EXISTS idx_team_vault_invitations_user_id ON team_vault_invitations(user_id);
