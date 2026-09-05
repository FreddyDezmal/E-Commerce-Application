import { signToken, verifyToken } from '../../../src/utils/jwt';

describe('JWT utilities', () => {
  it('should create and verify a customer token', () => {
    const payload = {
      sub: 'user-123',
      role: 'customer' as const
    };

    const token = signToken(payload);
    const result = verifyToken(token);

    expect(token).toBeDefined();
    expect(result).toEqual(payload);
  });

  it('should create and verify an admin token', () => {
    const payload = {
      sub: 'admin-123',
      role: 'admin' as const
    };

    const token = signToken(payload);
    const result = verifyToken(token);

    expect(result).toEqual(payload);
  });

  it('should reject an invalid token', () => {
    expect(() => verifyToken('invalid-token')).toThrow();
  });

  it('should reject a tampered token', () => {
    const payload = {
      sub: 'user-123',
      role: 'customer' as const
    };

    const token = signToken(payload);
    const tamperedToken = `${token}tampered`;

    expect(() => verifyToken(tamperedToken)).toThrow();
  });
});