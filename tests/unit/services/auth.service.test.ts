import { AuthService } from '../../../src/services/auth.service';
import { IUserRepository } from '../../../src/repositories/interfaces';
import { UserRecord } from '../../../src/types/domain';

describe('AuthService', () => {
  const userRepository: jest.Mocked<IUserRepository> = {
    findByEmail: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    updateProfile: jest.fn()
  };

  const authService = new AuthService(userRepository);

  const user: UserRecord = {
    id: 'user-123',
    email: 'test@example.com',
    passwordHash: 'hashed-password',
    fullName: 'Test User',
    role: 'customer',
    createdAt: new Date()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should register a new user successfully', async () => {
    userRepository.findByEmail.mockResolvedValue(null);
    userRepository.create.mockResolvedValue(user);

    const result = await authService.register({
      email: 'test@example.com',
      password: 'Password123!',
      fullName: 'Test User'
    });

    expect(userRepository.findByEmail).toHaveBeenCalledWith('test@example.com');
    expect(userRepository.create).toHaveBeenCalled();
    expect(result.user.email).toBe('test@example.com');
    expect(result.user.fullName).toBe('Test User');
    expect(result.user.role).toBe('customer');
    expect(result.token).toBeDefined();
  });

  it('should reject registration when email already exists', async () => {
    userRepository.findByEmail.mockResolvedValue(user);

    await expect(
      authService.register({
        email: 'test@example.com',
        password: 'Password123!',
        fullName: 'Test User'
      })
    ).rejects.toThrow('An account with this email already exists');

    expect(userRepository.create).not.toHaveBeenCalled();
  });

  it('should reject invalid registration input', async () => {
    await expect(
      authService.register({
        email: 'invalid-email',
        password: '123',
        fullName: ''
      })
    ).rejects.toThrow('Invalid registration input');

    expect(userRepository.findByEmail).not.toHaveBeenCalled();
    expect(userRepository.create).not.toHaveBeenCalled();
  });

  it('should login successfully with correct credentials', async () => {
    userRepository.findByEmail.mockResolvedValue(user);

    const passwordHash = await import('../../../src/utils/password').then(
      ({ hashPassword }) => hashPassword('Password123!')
    );

    userRepository.findByEmail.mockResolvedValue({
      ...user,
      passwordHash
    });

    const result = await authService.login({
      email: 'test@example.com',
      password: 'Password123!'
    });

    expect(userRepository.findByEmail).toHaveBeenCalledWith('test@example.com');
    expect(result.user.email).toBe('test@example.com');
    expect(result.token).toBeDefined();
  });

  it('should reject login when user does not exist', async () => {
    userRepository.findByEmail.mockResolvedValue(null);

    await expect(
      authService.login({
        email: 'unknown@example.com',
        password: 'Password123!'
      })
    ).rejects.toThrow('Invalid email or password');
  });

  it('should reject login when password is incorrect', async () => {
    const passwordHash = await import('../../../src/utils/password').then(
      ({ hashPassword }) => hashPassword('CorrectPassword123!')
    );

    userRepository.findByEmail.mockResolvedValue({
      ...user,
      passwordHash
    });

    await expect(
      authService.login({
        email: 'test@example.com',
        password: 'WrongPassword123!'
      })
    ).rejects.toThrow('Invalid email or password');
  });
});