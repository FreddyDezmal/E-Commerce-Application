import { UserService } from '../../../src/services/user.service';
import { IUserRepository } from '../../../src/repositories/interfaces';
import { UserRecord } from '../../../src/types/domain';

describe('UserService', () => {
  const userRepository: jest.Mocked<IUserRepository> = {
    findByEmail: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    updateProfile: jest.fn()
  };

  const userService = new UserService(userRepository);

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

  it('should get a user profile successfully', async () => {
    userRepository.findById.mockResolvedValue(user);

    const result = await userService.getProfile('user-123');

    expect(userRepository.findById).toHaveBeenCalledWith('user-123');

    expect(result).toEqual({
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      createdAt: user.createdAt
    });

    expect(result).not.toHaveProperty('passwordHash');
  });

  it('should reject profile request when user does not exist', async () => {
    userRepository.findById.mockResolvedValue(null);

    await expect(
      userService.getProfile('unknown-user')
    ).rejects.toThrow('User');

    expect(userRepository.findById).toHaveBeenCalledWith('unknown-user');
  });

  it('should update a user profile successfully', async () => {
    const updatedUser: UserRecord = {
      ...user,
      fullName: 'Updated User'
    };

    userRepository.updateProfile.mockResolvedValue(updatedUser);

    const result = await userService.updateProfile('user-123', {
      fullName: 'Updated User'
    });

    expect(userRepository.updateProfile).toHaveBeenCalledWith(
      'user-123',
      { fullName: 'Updated User' }
    );

    expect(result.fullName).toBe('Updated User');
    expect(result.email).toBe(user.email);
    expect(result.role).toBe(user.role);
    expect(result).not.toHaveProperty('passwordHash');
  });

  it('should reject invalid profile data', async () => {
    await expect(
      userService.updateProfile('user-123', {
        fullName: ''
      })
    ).rejects.toThrow('Invalid profile data');

    expect(userRepository.updateProfile).not.toHaveBeenCalled();
  });
});