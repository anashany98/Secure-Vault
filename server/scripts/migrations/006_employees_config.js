module.exports = async (client) => {
    console.log("Applying Migration V3 (Employees & Config)...");

    // 1. Employees Table
    // For personnel who are NOT app users but are assigned assets
    await client.query(`
        CREATE TABLE IF NOT EXISTS employees (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            full_name VARCHAR(255) NOT NULL,
            email VARCHAR(255),
            department VARCHAR(100),
            job_title VARCHAR(100),
            status VARCHAR(50) DEFAULT 'active', -- active, inactive
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
    `);

    // 2. App Config Table
    // Key-Value store for system settings
    await client.query(`
        CREATE TABLE IF NOT EXISTS app_config (
            key VARCHAR(100) PRIMARY KEY,
            value TEXT,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
    `);

    // Insert default Company Name if not exists
    await client.query(`
        INSERT INTO app_config (key, value) 
        VALUES ('company_name', 'Mi Empresa') 
        ON CONFLICT (key) DO NOTHING;
    `);

    // 3. Update Devices Table to support strict linking (optional but good)
    // We keep 'assigned_to' (text) for backward compat and "Other", 
    // but add FKs for better data integrity if they choose a User or Employee.
    await client.query(`
        ALTER TABLE devices 
        ADD COLUMN IF NOT EXISTS assigned_employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS assigned_user_id UUID REFERENCES users(id) ON DELETE SET NULL;
    `);

    console.log("Migration V3 Applied!");
};
