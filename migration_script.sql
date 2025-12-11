-- =====================================================
-- Script de Migración: localStorage → PostgreSQL
-- SecureVault - Migración de Datos
-- =====================================================

-- IMPORTANTE: Ejecutar primero database_schema.sql antes de este script

-- =====================================================
-- PASO 1: Insertar Usuario Admin por Defecto
-- =====================================================
INSERT INTO users (id, email, name, password_hash, role, created_at)
VALUES (
    'admin-001'::uuid,
    'admin@company.com',
    'Admin User',
    '$2a$10$YourHashedPasswordHere', -- Reemplazar con hash real de 'admin123'
    'admin',
    CURRENT_TIMESTAMP
)
ON CONFLICT (email) DO NOTHING;

-- =====================================================
-- PASO 2: Migración de Contraseñas (vault_items)
-- =====================================================
-- NOTA: Este INSERT debe ejecutarse desde tu aplicación JavaScript
-- ya que las contraseñas están en localStorage del navegador.
-- Usa el siguiente código JS para exportar:

/*
JavaScript para exportar desde localStorage:

const exportToSQL = () => {
    const passwords = JSON.parse(localStorage.getItem('vault_passwords') || '[]');
    
    const sqlStatements = passwords.map(p => {
        const escapedTitle = p.title.replace(/'/g, "''");
        const escapedUsername = p.username.replace(/'/g, "''");
        const escapedPassword = p.password.replace(/'/g, "''");
        const escapedUrl = (p.url || '').replace(/'/g, "''");
        const escapedPerson = (p.meta_person || '').replace(/'/g, "''");
        
        return `INSERT INTO vault_items (
            id, 
            user_id, 
            title, 
            username, 
            encrypted_password, 
            url, 
            meta_person, 
            is_favorite, 
            is_deleted
        ) VALUES (
            '${p.id}'::uuid,
            'admin-001'::uuid,
            '${escapedTitle}',
            '${escapedUsername}',
            '${escapedPassword}',
            '${escapedUrl}',
            '${escapedPerson}',
            ${p.isFavorite || false},
            ${p.isDeleted || false}
        );`;
    });
    
    console.log(sqlStatements.join('\n\n'));
    // Copiar el output de la consola y ejecutarlo en PostgreSQL
};

exportToSQL();
*/

-- =====================================================
-- PASO 3: Migración de Inventario (devices)
-- =====================================================
-- Similar al anterior, ejecutar desde JavaScript:

/*
const exportInventoryToSQL = () => {
    const devices = JSON.parse(localStorage.getItem('inventory_devices') || '[]');
    
    const sqlStatements = devices.map(d => {
        const escapedBrand = d.brand.replace(/'/g, "''");
        const escapedModel = d.model.replace(/'/g, "''");
        const escapedSerial = (d.serialNumber || '').replace(/'/g, "''");
        const escapedAssigned = (d.assignedTo || '').replace(/'/g, "''");
        const escapedLocation = (d.location || '').replace(/'/g, "''");
        const escapedNotes = (d.notes || '').replace(/'/g, "''");
        
        return `INSERT INTO devices (
            id,
            type,
            brand,
            model,
            serial_number,
            status,
            assigned_to,
            location,
            purchase_date,
            notes
        ) VALUES (
            '${d.id}'::uuid,
            '${d.type}',
            '${escapedBrand}',
            '${escapedModel}',
            '${escapedSerial}',
            '${d.status}',
            '${escapedAssigned}',
            '${escapedLocation}',
            ${d.purchaseDate ? `'${d.purchaseDate}'` : 'NULL'},
            '${escapedNotes}'
        );`;
    });
    
    console.log(sqlStatements.join('\n\n'));
};

exportInventoryToSQL();
*/

-- =====================================================
-- PASO 4: Verificación de Datos Migrados
-- =====================================================
-- Ejecutar estas queries para verificar:

-- Contar contraseñas migradas
SELECT COUNT(*) as total_passwords FROM vault_items;

-- Contar dispositivos migrados
SELECT COUNT(*) as total_devices FROM devices;

-- Ver contraseñas por persona
SELECT 
    meta_person, 
    COUNT(*) as count 
FROM vault_items 
WHERE is_deleted = false 
GROUP BY meta_person 
ORDER BY count DESC;

-- Ver dispositivos por estado
SELECT 
    status, 
    COUNT(*) as count 
FROM devices 
GROUP BY status;

-- =====================================================
-- PASO 5: Configuración de Seguridad
-- =====================================================

-- Crear usuario de aplicación con permisos limitados
CREATE USER securevault_app WITH PASSWORD 'your_secure_password_here';

-- Otorgar permisos específicos
GRANT CONNECT ON DATABASE your_database_name TO securevault_app;
GRANT USAGE ON SCHEMA public TO securevault_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO securevault_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO securevault_app;

-- =====================================================
-- NOTAS IMPORTANTES:
-- =====================================================
-- 1. Las contraseñas en vault_items.encrypted_password deben estar
--    encriptadas desde el cliente (AES-256)
-- 
-- 2. NUNCA almacenar password_hash de usuarios sin hashear
--    Usar bcrypt con salt rounds >= 10
--
-- 3. Habilitar SSL/TLS para conexiones a PostgreSQL en producción
--
-- 4. Configurar backups automáticos de la base de datos
--
-- 5. Implementar rate limiting en la API para prevenir ataques
-- =====================================================
