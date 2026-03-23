import axios from 'axios';

const API_URL = 'http://localhost:3001/api';
const adminEmail = process.env.VERIFY_ADMIN_EMAIL;
const adminPassword = process.env.VERIFY_ADMIN_PASSWORD;
const targetEmail = process.env.VERIFY_TARGET_EMAIL;
const targetPassword = process.env.VERIFY_TARGET_PASSWORD;

if (!adminEmail || !adminPassword || !targetEmail || !targetPassword) {
    throw new Error(
        'Set VERIFY_ADMIN_EMAIL, VERIFY_ADMIN_PASSWORD, VERIFY_TARGET_EMAIL and VERIFY_TARGET_PASSWORD before running this script'
    );
}

async function run() {
    try {
        console.log('1. Logging in Admin...');
        const loginAdmin = await axios.post(`${API_URL}/auth/login`, {
            email: adminEmail,
            password: adminPassword,
        });
        const adminToken = loginAdmin.data.token;
        console.log('   Admin login successful. Token obtained.');

        console.log('2. Logging in target user...');
        const loginTarget = await axios.post(`${API_URL}/auth/login`, {
            email: targetEmail,
            password: targetPassword,
        });
        const user2Id = loginTarget.data.user.id;
        const user2Token = loginTarget.data.token;
        console.log('   Target user login successful. ID:', user2Id);

        console.log('3. Creating Vault Item for Admin...');
        const vaultRes = await axios.post(`${API_URL}/vault`, {
            title: 'Shared Secret',
            username: 'admin_secret',
            encrypted_password: 'U2FsdGVkX1+dummyEncrypted',
            url: 'http://secret.com',
            is_favorite: false,
            tags: [],
            custom_fields: [],
        }, {
            headers: { Authorization: `Bearer ${adminToken}` },
        });
        const passwordId = vaultRes.data.id;
        console.log('   Vault item created. ID:', passwordId);

        console.log('4. Creating Internal Share (Admin -> User 2)...');
        const shareRes = await axios.post(`${API_URL}/shares/internal`, {
            passwordId,
            targetId: user2Id,
            permission: 'read',
            expiresIn: 3600000,
        }, {
            headers: { Authorization: `Bearer ${adminToken}` },
        });
        const shareId = shareRes.data.id;
        console.log('   Share created. ID:', shareId);

        console.log('5. Verifying target user can see the shared item...');
        const user2Vault = await axios.get(`${API_URL}/vault`, {
            headers: { Authorization: `Bearer ${user2Token}` },
        });

        const sharedItem = user2Vault.data.find((item) => item.id === passwordId);
        if (!sharedItem) {
            throw new Error('Target user cannot see the shared item');
        }

        console.log('   Success: target user can see the shared item:', sharedItem.title);

        console.log('6. Listing outgoing shares...');
        const listRes = await axios.get(`${API_URL}/shares/internal/outgoing`, {
            headers: { Authorization: `Bearer ${adminToken}` },
        });
        const found = listRes.data.find((share) => share.id === shareId);
        if (!found) {
            throw new Error('Share not found in outgoing list');
        }

        console.log('   Share found in outgoing list.');

        console.log('7. Revoking share...');
        await axios.delete(`${API_URL}/shares/internal/${shareId}`, {
            headers: { Authorization: `Bearer ${adminToken}` },
        });
        console.log('   Share revoked.');

        console.log('8. Verifying revocation...');
        const listRes2 = await axios.get(`${API_URL}/shares/internal/outgoing`, {
            headers: { Authorization: `Bearer ${adminToken}` },
        });
        if (listRes2.data.find((share) => share.id === shareId)) {
            throw new Error('Share still exists after revocation');
        }

        console.log('   Share successfully removed.');
    } catch (err) {
        console.error('FULL ERROR:', err.response ? err.response.data : err);
    }
}

run();
