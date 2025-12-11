-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. USERS TABLE
-- Stores admin and authorized users
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL, -- Store hashed passwords (e.g., bcrypt)
    role VARCHAR(50) DEFAULT 'user', -- 'admin', 'user'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. PASSWORDS VAULT TABLE
-- Stores the encrypted password entries
CREATE TABLE vault_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE, -- Owner of the entry
    title VARCHAR(255) NOT NULL, -- Service name (e.g., 'Google', 'Corporate ERP')
    username VARCHAR(255),
    encrypted_password TEXT NOT NULL, -- Ciphertext from client-side encryption
    url TEXT,
    meta_person VARCHAR(255), -- For assigning to specific employees/departments
    is_favorite BOOLEAN DEFAULT FALSE,
    is_deleted BOOLEAN DEFAULT FALSE, -- Soft delete for Recycle Bin
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. INVENTORY DEVICES TABLE
-- Stores hardware assets
CREATE TABLE devices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type VARCHAR(50) NOT NULL, -- 'ordenador', 'movil', 'monitor', 'impresora'
    brand VARCHAR(100) NOT NULL,
    model VARCHAR(100) NOT NULL,
    serial_number VARCHAR(100),
    status VARCHAR(50) DEFAULT 'stock', -- 'en_uso', 'stock', 'reparacion', 'baja'
    assigned_to VARCHAR(255), -- Name of employee assigned
    location VARCHAR(255), -- Office location
    purchase_date DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. DEVICE HISTORY TABLE
-- Tracks lifecycle events for audit (Maintenance History)
CREATE TABLE device_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
    performed_by UUID REFERENCES users(id) ON DELETE SET NULL, -- Admin who logged it
    event_type VARCHAR(50) NOT NULL, -- 'assignment', 'repair', 'maintenance', 'note'
    description TEXT,
    event_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_vault_items_user_id ON vault_items(user_id);
CREATE INDEX idx_vault_items_title ON vault_items(title);
CREATE INDEX idx_devices_status ON devices(status);
CREATE INDEX idx_devices_assigned_to ON devices(assigned_to);
