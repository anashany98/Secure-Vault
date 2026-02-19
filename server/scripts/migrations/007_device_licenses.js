module.exports = async (client) => {
    console.log("Applying Migration V4 (Device Licenses)...");

    // Device Licenses Table
    // Link Devices (Inventory) to Vault Items (Software Licenses/Accounts)
    await client.query(`
        CREATE TABLE IF NOT EXISTS device_licenses (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
            vault_item_id UUID REFERENCES vault_items(id) ON DELETE CASCADE,
            assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            notes TEXT,
            UNIQUE(device_id, vault_item_id) -- Prevent duplicate links
        );
    `);

    console.log("Migration V4 Applied!");
};
