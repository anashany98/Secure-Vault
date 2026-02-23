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
    recovery_codes TEXT -- Stored as JSON string
);

-- 2. PASSWORDS VAULT TABLE
CREATE TABLE IF NOT EXISTS vault_items (
    id TEXT PRIMARY KEY DEFAULT (uuid_generate_v4()),
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    username TEXT,
    encrypted_password TEXT NOT NULL,
    url TEXT,
    meta_person TEXT,
    is_favorite BOOLEAN DEFAULT 0,
    is_deleted BOOLEAN DEFAULT 0,
    deleted_at DATETIME,
    tags TEXT, -- JSON array
    custom_fields TEXT, -- JSON array
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
CREATE INDEX IF NOT EXISTS idx_vault_items_title ON vault_items(title);
CREATE INDEX IF NOT EXISTS idx_devices_status ON devices(status);
CREATE INDEX IF NOT EXISTS idx_devices_assigned_to ON devices(assigned_to);
CREATE INDEX IF NOT EXISTS idx_notes_user_id ON notes(user_id);
CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(status);
CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_shares_shared_with ON shares(shared_with);
CREATE INDEX IF NOT EXISTS idx_public_shares_expires_at ON public_shares(expires_at);
