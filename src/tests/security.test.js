import { describe, it, expect } from 'vitest';
import { calculateCrackTime } from '../lib/passwordSecurity';

describe('Password Security Logic', () => {
    it('should identify weak passwords', () => {
        const result = calculateCrackTime('123456');
        expect(result.level).toBe('weak');
        expect(result.color).toContain('red');
    });

    it('should identify strong passwords', () => {
        const result = calculateCrackTime('P@ssw0rd2026!SecureVault');
        expect(result.level).toBe('excellent');
        expect(result.color).toContain('emerald');
    });
});
