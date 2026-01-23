import { describe, it, expect, vi } from 'vitest';
const request = require('supertest');
const app = require('../index');

describe('Auth API and Server Health', () => {
    it('should return 200 for health check', async () => {
        const res = await request(app).get('/api/health');
        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty('status', 'ok');
    });

    it('should prevent access to protected routes without token', async () => {
        const res = await request(app).get('/api/vault');
        expect(res.statusCode).toBe(401);
    });
});
