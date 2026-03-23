import { beforeAll, describe, expect, it } from 'vitest';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const express = require('express');
const request = require('supertest');

process.env.NODE_ENV = 'test';
process.env.DB_CLIENT = 'sqlite';
process.env.SQLITE_DB_PATH = path.join(__dirname, 'auth.test.sqlite');
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';
process.env.CLIENT_VAULT_KEY = 'test-client-vault-key';
process.env.CLIENT_NOTES_KEY = 'test-client-notes-key';
process.env.BACKUP_ENCRYPTION_KEY = 'test-backup-encryption-key';
process.env.COOKIE_SECURE = 'false';
process.env.BOOTSTRAP_ADMIN_EMAIL = 'admin@test.local';
process.env.BOOTSTRAP_ADMIN_NAME = 'Auth Test Admin';
process.env.BOOTSTRAP_ADMIN_PASSWORD = 'AdminTest#2026';
process.env.LOGIN_LOCKOUT_ATTEMPTS = '3';
process.env.LOGIN_LOCKOUT_MINUTES = '15';
process.env.MANDATORY_2FA_ROLES = '';

for (const suffix of ['', '-wal', '-shm']) {
    const targetPath = `${process.env.SQLITE_DB_PATH}${suffix}`;
    if (fs.existsSync(targetPath)) {
        fs.rmSync(targetPath, { force: true });
    }
}

const initSQLite = require('../init_sqlite');
const app = require('../index');
const db = require('../db');
const { readBackupFile, restoreBackupPayload, writeBackupFile } = require('../services/disasterRecovery');

function uniqueEmail(prefix = 'user') {
    return `${prefix}.${Date.now()}.${Math.floor(Math.random() * 10000)}@example.com`;
}

async function login(email, password) {
    return request(app).post('/api/auth/login').send({ email, password });
}

async function loginAsAdmin() {
    const response = await login(
        process.env.BOOTSTRAP_ADMIN_EMAIL,
        process.env.BOOTSTRAP_ADMIN_PASSWORD
    );

    expect(response.statusCode).toBe(200);
    expect(response.body.token).toBeTruthy();
    return response.body.token;
}

async function registerUser({ email, name, password, role = 'user' }, token) {
    const httpRequest = request(app)
        .post('/api/auth/register')
        .send({ email, name, password, role });

    if (token) {
        httpRequest.set('Authorization', `Bearer ${token}`);
    }

    return httpRequest;
}

function clearAuthModuleCache() {
    for (const modulePath of ['../config', '../middleware/auth', '../routes/auth']) {
        delete require.cache[require.resolve(modulePath)];
    }
}

async function requestRegistrationOutsideTestMode(payload) {
    const previousEnv = process.env.NODE_ENV;

    try {
        process.env.NODE_ENV = 'development';
        clearAuthModuleCache();

        const authRouter = require('../routes/auth');
        const authApp = express();
        authApp.use(express.json());
        authApp.use('/api/auth', authRouter);

        return await request(authApp).post('/api/auth/register').send(payload);
    } finally {
        process.env.NODE_ENV = previousEnv;
        clearAuthModuleCache();
    }
}

beforeAll(async () => {
    await initSQLite();
});

describe('Auth API and Server Health', () => {
    it('should return 200 for health check', async () => {
        const res = await request(app).get('/api/health');
        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty('status', 'ok');
    });

    it('should prevent access to protected vault routes without token', async () => {
        const res = await request(app).get('/api/vault');
        expect(res.statusCode).toBe(401);
    });

    it('should reject public share creation without authentication', async () => {
        const res = await request(app)
            .post('/api/shares')
            .send({
                encryptedData: { password: 'secret' },
                settings: { expiration: 60000, views: 1 },
                type: 'password',
            });

        expect([401, 403]).toContain(res.statusCode);
    });

    it('should upload, list and delete encrypted attachments for vault items', async () => {
        const adminToken = await loginAsAdmin();
        const createResponse = await request(app)
            .post('/api/vault')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                title: 'VPN corporativa',
                username: 'vpn@example.com',
                encrypted_password: 'encrypted-password-payload',
                url: 'https://vpn.example.com',
                meta_person: 'IT',
                tags: [],
                custom_fields: [],
            });

        expect(createResponse.statusCode).toBe(200);
        expect(createResponse.body.id).toBeTruthy();

        const itemId = createResponse.body.id;
        const uploadResponse = await request(app)
            .post(`/api/vault/${itemId}/attachments`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                file_name: 'vpn-config.txt',
                mime_type: 'text/plain',
                size_bytes: 128,
                encrypted_data: 'encrypted-attachment-payload',
            });

        expect(uploadResponse.statusCode).toBe(200);
        expect(uploadResponse.body.fileName).toBe('vpn-config.txt');
        expect(uploadResponse.body.encryptedData).toBe('encrypted-attachment-payload');

        const attachmentId = uploadResponse.body.id;
        const listResponse = await request(app)
            .get(`/api/vault/${itemId}/attachments`)
            .set('Authorization', `Bearer ${adminToken}`);

        expect(listResponse.statusCode).toBe(200);
        expect(listResponse.body).toHaveLength(1);
        expect(listResponse.body[0].id).toBe(attachmentId);

        const deleteResponse = await request(app)
            .delete(`/api/vault/${itemId}/attachments/${attachmentId}`)
            .set('Authorization', `Bearer ${adminToken}`);

        expect(deleteResponse.statusCode).toBe(200);

        const listAfterDeleteResponse = await request(app)
            .get(`/api/vault/${itemId}/attachments`)
            .set('Authorization', `Bearer ${adminToken}`);

        expect(listAfterDeleteResponse.statusCode).toBe(200);
        expect(listAfterDeleteResponse.body).toHaveLength(0);
    });

    it('should block unauthenticated registration outside test mode', async () => {
        const response = await requestRegistrationOutsideTestMode({
            email: uniqueEmail('blocked'),
            name: 'Blocked User',
            password: 'Blocked#2026',
        });

        expect([401, 403]).toContain(response.statusCode);
    });

    it('should lock a user after repeated failed login attempts', async () => {
        const adminToken = await loginAsAdmin();
        const email = uniqueEmail('lockout');
        const password = 'Lockout#2026';

        const registerResponse = await registerUser(
            { email, name: 'Lockout User', password },
            adminToken
        );
        expect(registerResponse.statusCode).toBe(200);

        const attempt1 = await login(email, 'WrongPassword#1');
        const attempt2 = await login(email, 'WrongPassword#2');
        const attempt3 = await login(email, 'WrongPassword#3');
        const lockedAttempt = await login(email, password);

        expect(attempt1.statusCode).toBe(401);
        expect(attempt2.statusCode).toBe(401);
        expect(attempt3.statusCode).toBe(423);
        expect(lockedAttempt.statusCode).toBe(423);
    });

    it('should prevent non-admin users from listing users', async () => {
        const adminToken = await loginAsAdmin();
        const email = uniqueEmail('basic');
        const password = 'BasicUser#2026';

        const registerResponse = await registerUser(
            { email, name: 'Basic User', password },
            adminToken
        );
        expect(registerResponse.statusCode).toBe(200);

        const loginResponse = await login(email, password);
        expect(loginResponse.statusCode).toBe(200);

        const usersResponse = await request(app)
            .get('/api/auth/users')
            .set('Authorization', `Bearer ${loginResponse.body.token}`);

        expect(usersResponse.statusCode).toBe(403);
    });

    it('should summarize and transfer ownership between users', async () => {
        const adminLoginResponse = await login(
            process.env.BOOTSTRAP_ADMIN_EMAIL,
            process.env.BOOTSTRAP_ADMIN_PASSWORD
        );
        expect(adminLoginResponse.statusCode).toBe(200);

        const adminToken = adminLoginResponse.body.token;
        const adminUserId = adminLoginResponse.body.user.id;
        const sourceResponse = await registerUser(
            {
                email: uniqueEmail('transfer-source'),
                name: 'Transfer Source',
                password: 'TransferSource#2026',
            },
            adminToken
        );
        const targetResponse = await registerUser(
            {
                email: uniqueEmail('transfer-target'),
                name: 'Transfer Target',
                password: 'TransferTarget#2026',
            },
            adminToken
        );

        expect(sourceResponse.statusCode).toBe(200);
        expect(targetResponse.statusCode).toBe(200);

        const ids = {
            device: crypto.randomUUID(),
            group: crypto.randomUUID(),
            note: crypto.randomUUID(),
            share: crypto.randomUUID(),
            template: crypto.randomUUID(),
            vault: crypto.randomUUID(),
        };

        await db.query(
            `INSERT INTO vault_items (id, user_id, title, username, encrypted_password)
             VALUES ($1, $2, $3, $4, $5)`,
            [ids.vault, sourceResponse.body.id, 'Transfer VPN', 'transfer.user', 'encrypted-transfer']
        );
        await db.query(
            `INSERT INTO notes (id, user_id, title, content)
             VALUES ($1, $2, $3, $4)`,
            [ids.note, sourceResponse.body.id, 'Transfer Note', 'encrypted-note']
        );
        await db.query(
            `INSERT INTO vault_templates (id, user_id, name, title, username)
             VALUES ($1, $2, $3, $4, $5)`,
            [ids.template, sourceResponse.body.id, 'Transfer Template', 'Template Title', 'template.user']
        );
        await db.query(
            `INSERT INTO groups (id, name, description, created_by)
             VALUES ($1, $2, $3, $4)`,
            [ids.group, 'Transfer Group', 'Ownership transfer test', sourceResponse.body.id]
        );
        await db.query(
            `INSERT INTO shares (id, password_id, shared_by, shared_with, permission)
             VALUES ($1, $2, $3, $4, $5)`,
            [ids.share, ids.vault, sourceResponse.body.id, adminUserId, 'read']
        );
        await db.query(
            `INSERT INTO devices (id, type, brand, model, assigned_to, status)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [ids.device, 'laptop', 'Dell', 'Latitude', sourceResponse.body.email, 'assigned']
        );

        const summaryResponse = await request(app)
            .get(`/api/auth/users/${sourceResponse.body.id}/ownership-summary`)
            .set('Authorization', `Bearer ${adminToken}`);

        expect(summaryResponse.statusCode).toBe(200);
        expect(summaryResponse.body).toMatchObject({
            deviceAssignments: 1,
            groupsCreated: 1,
            notes: 1,
            outgoingShares: 1,
            templates: 1,
            vaultItems: 1,
        });

        const transferResponse = await request(app)
            .post('/api/auth/users/transfer-ownership')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                fromUserId: sourceResponse.body.id,
                toUserId: targetResponse.body.id,
                transferDeviceAssignments: true,
            });

        expect(transferResponse.statusCode).toBe(200);
        expect(transferResponse.body.fromUser.role).toBe('user');
        expect(transferResponse.body.toUser.role).toBe('user');
        expect(transferResponse.body.transferred).toMatchObject({
            deviceAssignments: 1,
            groupsCreated: 1,
            notes: 1,
            outgoingShares: 1,
            templates: 1,
            vaultItems: 1,
        });

        const [vaultOwner, noteOwner, templateOwner, groupOwner, shareOwner, deviceAssignment] = await Promise.all([
            db.query('SELECT user_id FROM vault_items WHERE id = $1', [ids.vault]),
            db.query('SELECT user_id FROM notes WHERE id = $1', [ids.note]),
            db.query('SELECT user_id FROM vault_templates WHERE id = $1', [ids.template]),
            db.query('SELECT created_by FROM groups WHERE id = $1', [ids.group]),
            db.query('SELECT shared_by FROM shares WHERE id = $1', [ids.share]),
            db.query('SELECT assigned_to FROM devices WHERE id = $1', [ids.device]),
        ]);

        expect(vaultOwner.rows[0].user_id).toBe(targetResponse.body.id);
        expect(noteOwner.rows[0].user_id).toBe(targetResponse.body.id);
        expect(templateOwner.rows[0].user_id).toBe(targetResponse.body.id);
        expect(groupOwner.rows[0].created_by).toBe(targetResponse.body.id);
        expect(shareOwner.rows[0].shared_by).toBe(targetResponse.body.id);
        expect(deviceAssignment.rows[0].assigned_to).toBe(targetResponse.body.name);
    });

    it('should return real alerts for reviews, checkout, shares and inventory', async () => {
        const adminLoginResponse = await login(
            process.env.BOOTSTRAP_ADMIN_EMAIL,
            process.env.BOOTSTRAP_ADMIN_PASSWORD
        );
        expect(adminLoginResponse.statusCode).toBe(200);

        const adminToken = adminLoginResponse.body.token;
        const adminUserId = adminLoginResponse.body.user.id;
        const sharedUserResponse = await registerUser(
            {
                email: uniqueEmail('alerts-user'),
                name: 'Alerts User',
                password: 'AlertsUser#2026',
            },
            adminToken
        );
        expect(sharedUserResponse.statusCode).toBe(200);

        const dueSoon = new Date(Date.now() + (30 * 60 * 1000)).toISOString();
        const ids = {
            device: crypto.randomUUID(),
            share: crypto.randomUUID(),
            vault: crypto.randomUUID(),
        };

        await db.query(
            `INSERT INTO vault_items (
                id, user_id, title, username, encrypted_password, next_review_at,
                checked_out_by, checked_out_until, checkout_note
             ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [
                ids.vault,
                adminUserId,
                'Alerts VPN',
                'alerts.user',
                'encrypted-alerts',
                dueSoon,
                adminUserId,
                dueSoon,
                'Revision urgente',
            ]
        );
        await db.query(
            `INSERT INTO shares (id, password_id, shared_by, shared_with, permission, expires_at)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [ids.share, ids.vault, adminUserId, sharedUserResponse.body.id, 'read', dueSoon]
        );
        await db.query(
            `INSERT INTO devices (id, type, brand, model, status)
             VALUES ($1, $2, $3, $4, $5)`,
            [ids.device, 'laptop', 'HP', 'EliteBook', 'stock']
        );

        const alertsResponse = await request(app)
            .get('/api/alerts')
            .set('Authorization', `Bearer ${adminToken}`);

        expect(alertsResponse.statusCode).toBe(200);
        expect(alertsResponse.body.some((alert) => alert.id.startsWith(`password-review:${ids.vault}:`))).toBe(true);
        expect(alertsResponse.body.some((alert) => alert.id.startsWith(`checkout:${ids.vault}:`))).toBe(true);
        expect(alertsResponse.body.some((alert) => alert.id.startsWith(`share:${ids.share}:`))).toBe(true);
        expect(alertsResponse.body.some((alert) => alert.id === `device-unassigned:${ids.device}`)).toBe(true);
    });

    it('should expose diff-based change log entries for vault items', async () => {
        const adminLoginResponse = await login(
            process.env.BOOTSTRAP_ADMIN_EMAIL,
            process.env.BOOTSTRAP_ADMIN_PASSWORD
        );
        expect(adminLoginResponse.statusCode).toBe(200);

        const adminToken = adminLoginResponse.body.token;
        const adminEmail = adminLoginResponse.body.user.email;
        const createResponse = await request(app)
            .post('/api/vault')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                title: 'Original VPN',
                username: 'original.user',
                encrypted_password: 'encrypted-original-password',
                url: 'https://original.example.com',
                meta_person: 'Original Owner',
                tags: ['vpn'],
                custom_fields: [],
            });

        expect(createResponse.statusCode).toBe(200);

        const updateResponse = await request(app)
            .put(`/api/vault/${createResponse.body.id}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                title: 'Updated VPN',
                username: 'updated.user',
                encrypted_password: 'encrypted-updated-password',
                url: 'https://updated.example.com',
                meta_person: 'Updated Owner',
                tags: ['vpn', 'critical'],
                custom_fields: [{ label: 'OTP', value: 'cipher-otp' }],
            });

        expect(updateResponse.statusCode).toBe(200);

        const changeLogResponse = await request(app)
            .get(`/api/vault/${createResponse.body.id}/change-log`)
            .set('Authorization', `Bearer ${adminToken}`);

        expect(changeLogResponse.statusCode).toBe(200);

        const updateEntry = changeLogResponse.body.find((entry) => entry.action === 'UPDATE_PASSWORD');
        expect(updateEntry).toBeTruthy();
        expect(updateEntry.userEmail).toBe(adminEmail);
        expect(updateEntry.details.title).toEqual({
            new: 'Updated VPN',
            old: 'Original VPN',
        });
        expect(updateEntry.details.username).toEqual({
            new: 'updated.user',
            old: 'original.user',
        });
        expect(updateEntry.details.meta_person).toEqual({
            new: 'Updated Owner',
            old: 'Original Owner',
        });
        expect(updateEntry.details.password).toEqual({ changed: true });
    });

    it('should initialize a team vault, migrate legacy ciphertext metadata and allow invited users to see team items', async () => {
        const bootstrapAdminToken = await loginAsAdmin();
        const adminEmail = uniqueEmail('teamadmin');
        const adminPassword = 'TeamAdmin#2026';
        const memberEmail = uniqueEmail('teammember');
        const memberPassword = 'TeamMember#2026';

        const [registerAdminResponse, registerMemberResponse] = await Promise.all([
            registerUser(
                { email: adminEmail, name: 'Team Admin', password: adminPassword, role: 'admin' },
                bootstrapAdminToken
            ),
            registerUser(
                { email: memberEmail, name: 'Team Member', password: memberPassword },
                bootstrapAdminToken
            ),
        ]);

        expect(registerAdminResponse.statusCode).toBe(200);
        expect(registerMemberResponse.statusCode).toBe(200);

        const adminUserId = registerAdminResponse.body.id;
        const memberUserId = registerMemberResponse.body.id;
        await db.query('UPDATE users SET role = $1 WHERE id = $2', ['admin', adminUserId]);
        const ids = {
            attachment: crypto.randomUUID(),
            history: crypto.randomUUID(),
            note: crypto.randomUUID(),
            teamVaultItem: crypto.randomUUID(),
            vault: crypto.randomUUID(),
        };

        await db.query(
            `INSERT INTO vault_items (id, user_id, title, username, encrypted_password, custom_fields)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [
                ids.vault,
                adminUserId,
                'Legacy VPN',
                'legacy.user',
                'legacy-password-ciphertext',
                JSON.stringify([{ label: 'OTP', value: 'legacy-custom-field' }]),
            ]
        );
        await db.query(
            `INSERT INTO vault_item_attachments (id, vault_item_id, file_name, mime_type, size_bytes, encrypted_data)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [ids.attachment, ids.vault, 'legacy.txt', 'text/plain', 64, 'legacy-attachment-ciphertext']
        );
        await db.query(
            `INSERT INTO password_history (id, vault_item_id, encrypted_password)
             VALUES ($1, $2, $3)`,
            [ids.history, ids.vault, 'legacy-history-ciphertext']
        );
        await db.query(
            `INSERT INTO notes (id, user_id, title, content)
             VALUES ($1, $2, $3, $4)`,
            [ids.note, adminUserId, 'Legacy Note', 'legacy-note-ciphertext']
        );

        const adminLoginResponse = await login(adminEmail, adminPassword);
        expect(adminLoginResponse.statusCode).toBe(200);
        expect(adminLoginResponse.body.clientCrypto).toBeUndefined();
        expect(adminLoginResponse.body.vaultAccess).toMatchObject({
            canInitialize: true,
            isConfigured: false,
            migrationRequired: true,
            teamInitialized: false,
        });

        const legacyCryptoResponse = await request(app)
            .get('/api/auth/legacy-client-crypto')
            .set('Authorization', `Bearer ${adminLoginResponse.body.token}`);

        expect(legacyCryptoResponse.statusCode).toBe(200);
        expect(legacyCryptoResponse.body.vaultKey).toBeTruthy();
        expect(legacyCryptoResponse.body.notesKey).toBeTruthy();

        const setupResponse = await request(app)
            .post('/api/auth/vault/setup')
            .set('Authorization', `Bearer ${adminLoginResponse.body.token}`)
            .send({
                kdfIterations: 310000,
                kdfSalt: 'c2VhbS12YXVsdC1zYWx0',
                wrappedVaultKey: 'team-wrapped-vault-key',
                wrappedNotesKey: 'team-wrapped-notes-key',
                vaultKeyVerifier: 'team-vault-key-verifier',
                notesKeyVerifier: 'team-notes-key-verifier',
                migration: {
                    vaultItems: [
                        {
                            id: ids.vault,
                            encrypted_password: 'migrated-password-ciphertext',
                            custom_fields: [{ label: 'OTP', value: 'migrated-custom-field' }],
                        },
                    ],
                    attachments: [
                        {
                            id: ids.attachment,
                            encrypted_data: 'migrated-attachment-ciphertext',
                        },
                    ],
                    passwordHistory: [
                        {
                            id: ids.history,
                            encrypted_password: 'migrated-history-ciphertext',
                        },
                    ],
                    notes: [
                        {
                            id: ids.note,
                            content: 'migrated-note-ciphertext',
                        },
                    ],
                },
            });

        expect(setupResponse.statusCode).toBe(200);
        expect(setupResponse.body.vaultAccess).toMatchObject({
            isConfigured: true,
            migrationRequired: false,
            mode: 'team',
            teamInitialized: true,
        });

        const [userRow, vaultRow, attachmentRow, historyRow, noteRow, configRows] = await Promise.all([
            db.query(
                `SELECT vault_kdf_salt, vault_wrapped_vault_key, vault_wrapped_notes_key, vault_key_verifier,
                        notes_key_verifier, vault_access_scope
                 FROM users WHERE id = $1`,
                [adminUserId]
            ),
            db.query(
                'SELECT encrypted_password, custom_fields, crypto_scope FROM vault_items WHERE id = $1',
                [ids.vault]
            ),
            db.query(
                'SELECT encrypted_data FROM vault_item_attachments WHERE id = $1',
                [ids.attachment]
            ),
            db.query(
                'SELECT encrypted_password FROM password_history WHERE id = $1',
                [ids.history]
            ),
            db.query(
                'SELECT content, crypto_scope FROM notes WHERE id = $1',
                [ids.note]
            ),
            db.query(
                `SELECT key, value
                 FROM app_config
                 WHERE key IN ('vault_access_mode', 'team_vault_initialized_by')`
            ),
        ]);

        expect(userRow.rows[0].vault_kdf_salt).toBe('c2VhbS12YXVsdC1zYWx0');
        expect(userRow.rows[0].vault_wrapped_vault_key).toBe('team-wrapped-vault-key');
        expect(userRow.rows[0].vault_wrapped_notes_key).toBe('team-wrapped-notes-key');
        expect(userRow.rows[0].vault_key_verifier).toBe('team-vault-key-verifier');
        expect(userRow.rows[0].notes_key_verifier).toBe('team-notes-key-verifier');
        expect(userRow.rows[0].vault_access_scope).toBe('team');
        expect(vaultRow.rows[0].encrypted_password).toBe('migrated-password-ciphertext');
        expect(vaultRow.rows[0].custom_fields).toContain('migrated-custom-field');
        expect(vaultRow.rows[0].crypto_scope).toBe('team');
        expect(attachmentRow.rows[0].encrypted_data).toBe('migrated-attachment-ciphertext');
        expect(historyRow.rows[0].encrypted_password).toBe('migrated-history-ciphertext');
        expect(noteRow.rows[0].content).toBe('migrated-note-ciphertext');
        expect(noteRow.rows[0].crypto_scope).toBe('team');
        expect(configRows.rows.find((row) => row.key === 'vault_access_mode')?.value).toBe('team');
        expect(configRows.rows.find((row) => row.key === 'team_vault_initialized_by')?.value).toBe(adminUserId);

        const createTeamItemResponse = await request(app)
            .post('/api/vault')
            .set('Authorization', `Bearer ${adminLoginResponse.body.token}`)
            .send({
                title: 'Shared Team Secret',
                username: 'team.user',
                encrypted_password: 'team-shared-ciphertext',
                url: 'https://team.example.com',
                meta_person: 'Team',
                tags: [],
                custom_fields: [],
            });

        expect(createTeamItemResponse.statusCode).toBe(200);
        expect(createTeamItemResponse.body.crypto_scope).toBe('team');
        ids.teamVaultItem = createTeamItemResponse.body.id;

        const invitationCreateResponse = await request(app)
            .post('/api/auth/team-vault/invitations')
            .set('Authorization', `Bearer ${adminLoginResponse.body.token}`)
            .send({
                targetUserId: memberUserId,
                encryptedVaultKey: 'encrypted-invite-vault-key',
                encryptedNotesKey: 'encrypted-invite-notes-key',
                encryptedVerifier: 'encrypted-invite-verifier',
                expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
            });

        expect(invitationCreateResponse.statusCode).toBe(200);
        expect(invitationCreateResponse.body.id).toBeTruthy();

        const memberLoginResponse = await login(memberEmail, memberPassword);
        expect(memberLoginResponse.statusCode).toBe(200);
        expect(memberLoginResponse.body.vaultAccess).toMatchObject({
            invitationPending: true,
            isConfigured: false,
            mode: 'team',
            teamInitialized: true,
        });

        const pendingInvitationResponse = await request(app)
            .get('/api/auth/team-vault/invitation')
            .set('Authorization', `Bearer ${memberLoginResponse.body.token}`);

        expect(pendingInvitationResponse.statusCode).toBe(200);
        expect(pendingInvitationResponse.body.invitation.id).toBe(invitationCreateResponse.body.id);

        const acceptInvitationResponse = await request(app)
            .post('/api/auth/team-vault/accept')
            .set('Authorization', `Bearer ${memberLoginResponse.body.token}`)
            .send({
                invitationId: invitationCreateResponse.body.id,
                kdfIterations: 310000,
                kdfSalt: 'bWVtYmVyLXRlYW0tc2FsdA==',
                wrappedVaultKey: 'member-team-wrapped-vault-key',
                wrappedNotesKey: 'member-team-wrapped-notes-key',
                vaultKeyVerifier: 'member-team-vault-verifier',
                notesKeyVerifier: 'member-team-notes-verifier',
                migration: {
                    vaultItems: [],
                    attachments: [],
                    passwordHistory: [],
                    notes: [],
                },
            });

        expect(acceptInvitationResponse.statusCode).toBe(200);
        expect(acceptInvitationResponse.body.vaultAccess).toMatchObject({
            isConfigured: true,
            mode: 'team',
            teamInitialized: true,
        });

        const memberVaultResponse = await request(app)
            .get('/api/vault')
            .set('Authorization', `Bearer ${memberLoginResponse.body.token}`);

        expect(memberVaultResponse.statusCode).toBe(200);
        expect(memberVaultResponse.body.some((item) => item.id === ids.teamVaultItem)).toBe(true);

        const memberUserRow = await db.query(
            `SELECT vault_access_scope, vault_wrapped_vault_key, vault_wrapped_notes_key
             FROM users WHERE id = $1`,
            [memberUserId]
        );
        expect(memberUserRow.rows[0].vault_access_scope).toBe('team');
        expect(memberUserRow.rows[0].vault_wrapped_vault_key).toBe('member-team-wrapped-vault-key');
        expect(memberUserRow.rows[0].vault_wrapped_notes_key).toBe('member-team-wrapped-notes-key');
    });

    it('should back up all tables and restore them from a real encrypted backup file', async () => {
        const adminToken = await loginAsAdmin();
        const managedEmail = uniqueEmail('backup');
        const managedPassword = 'Backup#2026';
        const registerResponse = await registerUser(
            { email: managedEmail, name: 'Backup User', password: managedPassword },
            adminToken
        );

        expect(registerResponse.statusCode).toBe(200);
        const managedUserId = registerResponse.body.id;

        const userLoginResponse = await login(managedEmail, managedPassword);
        expect(userLoginResponse.statusCode).toBe(200);

        const ids = {
            attachment: crypto.randomUUID(),
            device: crypto.randomUUID(),
            deviceHistory: crypto.randomUUID(),
            employee: crypto.randomUUID(),
            group: crypto.randomUUID(),
            groupMember: crypto.randomUUID(),
            note: crypto.randomUUID(),
            publicShare: crypto.randomUUID(),
            share: crypto.randomUUID(),
            vault: crypto.randomUUID(),
        };

        await db.query(
            `INSERT INTO employees (id, full_name, email, department, job_title, status)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [ids.employee, 'Backup Employee', 'employee.backup@example.com', 'IT', 'Sysadmin', 'active']
        );
        await db.query(
            `INSERT INTO devices (id, type, brand, model, serial_number, status, assigned_to, location, purchase_date, notes)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
            [
                ids.device,
                'laptop',
                'Lenovo',
                'T14',
                'SN-BACKUP-001',
                'assigned',
                'Backup Employee',
                'Madrid',
                '2026-03-19',
                'Backup device',
            ]
        );
        await db.query(
            `INSERT INTO device_history (id, device_id, performed_by, event_type, description)
             VALUES ($1, $2, $3, $4, $5)`,
            [ids.deviceHistory, ids.device, managedUserId, 'ASSIGN', 'Assigned during backup test']
        );
        await db.query(
            `INSERT INTO app_config (key, value)
             VALUES ($1, $2)
             ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP`,
            ['company_name', 'Backup Test Company']
        );
        await db.query(
            `INSERT INTO groups (id, name, description, created_by)
             VALUES ($1, $2, $3, $4)`,
            [ids.group, 'Backup Test Group', 'Group used for backup restore test', managedUserId]
        );
        await db.query(
            `INSERT INTO group_members (id, group_id, user_id, role)
             VALUES ($1, $2, $3, $4)`,
            [ids.groupMember, ids.group, managedUserId, 'member']
        );
        await db.query(
            `INSERT INTO notes (id, user_id, title, content, is_favorite, is_deleted)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [ids.note, managedUserId, 'Backup Note', 'encrypted-note-payload', true, false]
        );
        await db.query(
            `INSERT INTO vault_items (
                id, user_id, title, username, encrypted_password, url, meta_person,
                is_favorite, is_deleted, tags, custom_fields, folder_id
             ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
            [
                ids.vault,
                managedUserId,
                'Backup VPN',
                'backup.user@example.com',
                'encrypted-password',
                'https://vpn.backup.local',
                'Backup Owner',
                true,
                false,
                JSON.stringify(['ops', 'vpn']),
                JSON.stringify([{ label: 'OTP', value: 'encrypted-otp' }]),
                null,
            ]
        );
        await db.query(
            `INSERT INTO vault_item_attachments (id, vault_item_id, file_name, mime_type, size_bytes, encrypted_data)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [ids.attachment, ids.vault, 'vpn.txt', 'text/plain', 128, 'encrypted-attachment']
        );
        await db.query(
            `INSERT INTO shares (id, password_id, shared_by, shared_with, permission)
             VALUES ($1, $2, $3, $4, $5)`,
            [ids.share, ids.vault, managedUserId, process.env.BOOTSTRAP_ADMIN_EMAIL === managedEmail ? managedUserId : registerResponse.body.id, 'read']
        );
        await db.query(
            `INSERT INTO public_shares (id, data, type, expires_at, views_left, max_views)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [ids.publicShare, JSON.stringify({ title: 'Backup VPN' }), 'password', '2099-01-01T00:00:00.000Z', 1, 1]
        );

        const backupFilePath = path.join(__dirname, `backup-restore-${Date.now()}.json.enc`);
        const { backupPayload } = await writeBackupFile(backupFilePath);

        expect(fs.existsSync(backupFilePath)).toBe(true);
        expect(backupFilePath.endsWith('.enc')).toBe(true);
        expect(Object.keys(backupPayload.tables)).toEqual(expect.arrayContaining([
            'app_config',
            'audit_logs',
            'device_history',
            'devices',
            'employees',
            'group_members',
            'groups',
            'notes',
            'public_shares',
            'sessions',
            'shares',
            'users',
            'vault_item_attachments',
            'vault_items',
        ]));
        expect(backupPayload.cryptoKeyFingerprints?.vaultKeyFingerprint).toBeTruthy();
        expect(backupPayload.cryptoKeyFingerprints?.notesKeyFingerprint).toBeTruthy();
        expect(fs.readFileSync(backupFilePath, 'utf8')).not.toContain('Backup VPN');

        await db.query('DELETE FROM public_shares');
        await db.query('DELETE FROM shares');
        await db.query('DELETE FROM vault_item_attachments');
        await db.query('DELETE FROM vault_items');
        await db.query('DELETE FROM notes');
        await db.query('DELETE FROM group_members');
        await db.query('DELETE FROM groups');
        await db.query('DELETE FROM device_history');
        await db.query('DELETE FROM devices');
        await db.query('DELETE FROM employees');
        await db.query(
            `INSERT INTO app_config (key, value)
             VALUES ($1, $2)
             ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP`,
            ['company_name', 'Corrupted Company']
        );

        const { backupPayload: filePayload } = readBackupFile(backupFilePath);
        const restoreResult = await restoreBackupPayload(filePayload);

        expect(restoreResult.restoredCounts.vault_item_attachments).toBeGreaterThan(0);
        expect(restoreResult.restoredCounts.vault_items).toBeGreaterThan(0);

        const [restoredCompany, restoredNote, restoredAttachment, restoredGroupMember, restoredShare] = await Promise.all([
            db.query('SELECT value FROM app_config WHERE key = $1', ['company_name']),
            db.query('SELECT id FROM notes WHERE id = $1', [ids.note]),
            db.query('SELECT id FROM vault_item_attachments WHERE id = $1', [ids.attachment]),
            db.query('SELECT id FROM group_members WHERE id = $1', [ids.groupMember]),
            db.query('SELECT id FROM shares WHERE id = $1', [ids.share]),
        ]);

        expect(restoredCompany.rows[0].value).toBe('Backup Test Company');
        expect(restoredNote.rows[0].id).toBe(ids.note);
        expect(restoredAttachment.rows[0].id).toBe(ids.attachment);
        expect(restoredGroupMember.rows[0].id).toBe(ids.groupMember);
        expect(restoredShare.rows[0].id).toBe(ids.share);

        fs.unlinkSync(backupFilePath);
    });
});
