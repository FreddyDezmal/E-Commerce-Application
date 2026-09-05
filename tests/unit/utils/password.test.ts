import { hashPassword, comparePassword } from '../../../src/utils/password';

describe('Password utilities', () => {
  it('should hash a password', async () => {
    const password = 'Password123!';

    const hash = await hashPassword(password);

    expect(hash).toBeDefined();
    expect(hash).not.toBe(password);
  });

  it('should return true when comparing the correct password', async () => {
    const password = 'Password123!';

    const hash = await hashPassword(password);

    const result = await comparePassword(password, hash);

    expect(result).toBe(true);
  });

  it('should return false when comparing an incorrect password', async () => {
    const password = 'Password123!';
    const wrongPassword = 'WrongPassword123!';

    const hash = await hashPassword(password);

    const result = await comparePassword(wrongPassword, hash);

    expect(result).toBe(false);
  });
});