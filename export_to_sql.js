/**
 * ═══════════════════════════════════════════════════════
 * EXPORTADOR DE DATOS - SecureVault (UI VERSION)
 * ═══════════════════════════════════════════════════════
 * 
 * INSTRUCCIONES:
 * 1. Abre http://localhost:3000
 * 2. F12 → Console
 * 3. Pega este script y presiona Enter
 * 4. Aparecerá una ventana para ingresar la clave
 */

(function () {
    'use strict';

    console.log('🚀 Iniciando exportador de datos...');

    // Crear modal UI
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.9);
        z-index: 99999;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: system-ui, -apple-system, sans-serif;
    `;

    modal.innerHTML = `
        <div style="
            background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
            border: 2px solid #10b981;
            border-radius: 20px;
            padding: 40px;
            max-width: 500px;
            box-shadow: 0 20px 60px rgba(16, 185, 129, 0.3);
        ">
            <h2 style="
                color: #10b981;
                margin: 0 0 20px 0;
                font-size: 24px;
                font-weight: bold;
                display: flex;
                align-items: center;
                gap: 10px;
            ">
                🔐 Clave Maestra de Encriptación
            </h2>
            
            <p style="color: #94a3b8; margin: 0 0 20px 0; font-size: 14px; line-height: 1.6;">
                Ingresa una clave segura para encriptar las contraseñas antes de exportar.
            </p>
            
            <div style="
                background: #0f172a;
                border: 1px solid #334155;
                border-radius: 10px;
                padding: 15px;
                margin-bottom: 20px;
            ">
                <p style="color: #f59e0b; margin: 0 0 10px 0; font-size: 13px; font-weight: 600;">
                    ⚠️ REQUISITOS:
                </p>
                <ul style="color: #cbd5e1; margin: 0; padding-left: 20px; font-size: 13px; line-height: 1.8;">
                    <li>Mínimo 16 caracteres</li>
                    <li>Usa mayúsculas, minúsculas, números y símbolos</li>
                    <li>GUARDA ESTA CLAVE - la necesitarás en el backend</li>
                </ul>
            </div>
            
            <input 
                type="text" 
                id="masterKeyInput" 
                placeholder="Ejemplo: MyS3cur3M@st3rK3y!2024"
                style="
                    width: 100%;
                    padding: 15px;
                    border: 2px solid #334155;
                    border-radius: 10px;
                    background: #0f172a;
                    color: #fff;
                    font-size: 16px;
                    font-family: 'Courier New', monospace;
                    box-sizing: border-box;
                    margin-bottom: 10px;
                "
            />
            
            <div id="strengthBar" style="
                height: 4px;
                background: #1e293b;
                border-radius: 2px;
                margin-bottom: 20px;
                overflow: hidden;
            ">
                <div id="strengthFill" style="
                    height: 100%;
                    width: 0%;
                    background: #ef4444;
                    transition: all 0.3s;
                "></div>
            </div>
            
            <p id="strengthText" style="
                color: #64748b;
                font-size: 12px;
                margin: 0 0 20px 0;
                min-height: 18px;
            "></p>
            
            <div style="display: flex; gap: 15px;">
                <button id="cancelBtn" style="
                    flex: 1;
                    padding: 15px;
                    border: 2px solid #334155;
                    border-radius: 10px;
                    background: transparent;
                    color: #94a3b8;
                    font-size: 16px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s;
                ">
                    Cancelar
                </button>
                <button id="exportBtn" style="
                    flex: 2;
                    padding: 15px;
                    border: none;
                    border-radius: 10px;
                    background: linear-gradient(135deg, #10b981, #059669);
                    color: #fff;
                    font-size: 16px;
                    font-weight: 600;
                    cursor: pointer;
                    box-shadow: 0 4px 15px rgba(16, 185, 129, 0.4);
                    transition: all 0.2s;
                " disabled>
                    🔒 Exportar con Encriptación
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    const input = document.getElementById('masterKeyInput');
    const exportBtn = document.getElementById('exportBtn');
    const cancelBtn = document.getElementById('cancelBtn');
    const strengthFill = document.getElementById('strengthFill');
    const strengthText = document.getElementById('strengthText');

    // Validación en tiempo real
    input.addEventListener('input', () => {
        const value = input.value;
        const length = value.length;

        let strength = 0;
        let color = '#ef4444';
        let text = '';

        if (length >= 16) {
            strength = 25;
            if (/[a-z]/.test(value)) strength += 25;
            if (/[A-Z]/.test(value)) strength += 25;
            if (/[0-9]/.test(value)) strength += 15;
            if (/[^a-zA-Z0-9]/.test(value)) strength += 10;

            if (strength < 50) {
                color = '#f59e0b';
                text = '⚠️ Débil - Añade más variedad';
            } else if (strength < 80) {
                color = '#3b82f6';
                text = '✓ Aceptable';
            } else {
                color = '#10b981';
                text = '✅ Fuerte - Perfecta';
            }

            exportBtn.disabled = false;
            exportBtn.style.opacity = '1';
            exportBtn.style.cursor = 'pointer';
        } else {
            text = `Faltan ${16 - length} caracteres para el mínimo`;
            exportBtn.disabled = true;
            exportBtn.style.opacity = '0.5';
            exportBtn.style.cursor = 'not-allowed';
        }

        strengthFill.style.width = `${(length / 16) * 100}%`;
        strengthFill.style.background = color;
        strengthText.textContent = text;
        strengthText.style.color = color;
    });

    // Cancelar
    cancelBtn.onclick = () => {
        console.log('❌ Exportación cancelada por el usuario');
        modal.remove();
    };

    // Exportar
    exportBtn.onclick = async () => {
        const MASTER_KEY = input.value;

        if (!MASTER_KEY || MASTER_KEY.length < 16) {
            alert('❌ La clave debe tener al menos 16 caracteres');
            return;
        }

        modal.remove();
        console.log('✅ Clave aceptada - Iniciando exportación...\n');

        // ═════════════════════════════════════════════════
        // FUNCIONES DE ENCRIPTACIÓN
        // ═════════════════════════════════════════════════
        function encryptPassword(plaintext, masterKey) {
            const encoder = new TextEncoder();
            const data = encoder.encode(plaintext);
            const keyBytes = encoder.encode(masterKey);
            const encrypted = Array.from(data).map((byte, i) =>
                byte ^ keyBytes[i % keyBytes.length]
            );
            return btoa(String.fromCharCode(...encrypted));
        }

        async function hashPassword(password) {
            const encoder = new TextEncoder();
            const data = encoder.encode(password);
            const hashBuffer = await crypto.subtle.digest('SHA-256', data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        }

        // ═════════════════════════════════════════════════
        // EXPORTAR CONTRASEÑAS
        // ═════════════════════════════════════════════════
        function exportPasswordsToSQL() {
            const passwords = JSON.parse(localStorage.getItem('vault_passwords') || '[]');
            if (passwords.length === 0) {
                console.log('⚠️  Sin contraseñas');
                return '';
            }

            console.log(`📦 ${passwords.length} contraseñas → Encriptando...`);

            const sqlStatements = passwords.map(p => {
                const escape = (str) => String(str || '').replace(/'/g, "''");
                const encryptedPassword = encryptPassword(p.password, MASTER_KEY);

                return `INSERT INTO vault_items (id, user_id, title, username, encrypted_password, url, meta_person, is_favorite, is_deleted, created_at) VALUES ('${p.id}'::uuid, 'admin-001'::uuid, '${escape(p.title)}', '${escape(p.username)}', '${escape(encryptedPassword)}', ${p.url ? `'${escape(p.url)}'` : 'NULL'}, ${p.meta_person ? `'${escape(p.meta_person)}'` : 'NULL'}, ${p.isFavorite || false}, ${p.isDeleted || false}, CURRENT_TIMESTAMP);`;
            });

            console.log('✅ Encriptadas');
            return sqlStatements.join('\n');
        }

        // ═════════════════════════════════════════════════
        // EXPORTAR DISPOSITIVOS
        // ═════════════════════════════════════════════════
        function exportInventoryToSQL() {
            const devices = JSON.parse(localStorage.getItem('inventory_devices') || '[]');
            if (devices.length === 0) {
                console.log('⚠️  Sin dispositivos');
                return '';
            }

            console.log(`📦 ${devices.length} dispositivos`);

            const sqlStatements = devices.map(d => {
                const escape = (str) => String(str || '').replace(/'/g, "''");
                return `INSERT INTO devices (id, type, brand, model, serial_number, status, assigned_to, location, purchase_date, notes, created_at) VALUES ('${d.id}'::uuid, '${escape(d.type)}', '${escape(d.brand)}', '${escape(d.model)}', ${d.serialNumber ? `'${escape(d.serialNumber)}'` : 'NULL'}, '${escape(d.status)}', ${d.assignedTo ? `'${escape(d.assignedTo)}'` : 'NULL'}, ${d.location ? `'${escape(d.location)}'` : 'NULL'}, ${d.purchaseDate ? `'${d.purchaseDate}'` : 'NULL'}, ${d.notes ? `'${escape(d.notes)}'` : 'NULL'}, CURRENT_TIMESTAMP);`;
            });

            return sqlStatements.join('\n');
        }

        // ═════════════════════════════════════════════════
        // EXPORTAR USUARIOS
        // ═════════════════════════════════════════════════
        async function exportUsersToSQL() {
            const users = JSON.parse(localStorage.getItem('secure_vault_users') || '[]');
            if (users.length === 0) return '';

            console.log(`📦 ${users.length} usuarios → Hasheando...`);

            const sqlStatements = await Promise.all(
                users.filter(u => u.email !== 'admin@company.com').map(async (u) => {
                    const escape = (str) => String(str || '').replace(/'/g, "''");
                    const hashedPassword = await hashPassword(u.password);
                    return `INSERT INTO users (id, email, name, password_hash, role, created_at) VALUES ('${u.id}'::uuid, '${escape(u.email)}', '${escape(u.name)}', '${hashedPassword}', '${escape(u.role || 'user')}', CURRENT_TIMESTAMP) ON CONFLICT (email) DO NOTHING;`;
                })
            );

            console.log('✅ Hasheados');
            return sqlStatements.join('\n');
        }

        // ═════════════════════════════════════════════════
        // GENERAR SQL
        // ═════════════════════════════════════════════════
        const usersSQL = await exportUsersToSQL();
        const passwordsSQL = exportPasswordsToSQL();
        const inventorySQL = exportInventoryToSQL();

        const fullSQL = `-- SecureVault Migration (Encrypted)
-- Generated: ${new Date().toISOString()}
-- Key Preview: ${MASTER_KEY.substring(0, 4)}****${MASTER_KEY.substring(MASTER_KEY.length - 4)}

${usersSQL}

${passwordsSQL}

${inventorySQL}

SELECT 'Usuarios:' as tipo, COUNT(*) FROM users UNION ALL SELECT 'Contraseñas:', COUNT(*) FROM vault_items UNION ALL SELECT 'Dispositivos:', COUNT(*) FROM devices;
`;

        // ═════════════════════════════════════════════════
        // DESCARGAR ARCHIVOS
        // ═════════════════════════════════════════════════
        const ts = Date.now();

        // SQL
        const blob = new Blob([fullSQL], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `securevault_${ts}.sql`;
        link.click();

        // Clave
        const keyBlob = new Blob([`CLAVE MAESTRA SECUREVAULT\n\n${MASTER_KEY}\n\n⚠️ GUARDA ESTA CLAVE EN UN LUGAR SEGURO`], { type: 'text/plain' });
        const keyUrl = URL.createObjectURL(keyBlob);
        const keyLink = document.createElement('a');
        keyLink.href = keyUrl;
        keyLink.download = `MASTER_KEY_${ts}.txt`;
        keyLink.click();

        console.log('\n✅ COMPLETADO');
        console.log('📁 Archivos descargados:');
        console.log('   1. securevault_*.sql');
        console.log('   2. MASTER_KEY_*.txt\n');

        alert('✅ Exportación completada!\n\n' +
            '📁 2 archivos descargados:\n' +
            '   • SQL con datos encriptados\n' +
            '   • Clave maestra\n\n' +
            '⚠️ GUARDA LA CLAVE MAESTRA');
    };

    // Focus automático
    input.focus();

})();
