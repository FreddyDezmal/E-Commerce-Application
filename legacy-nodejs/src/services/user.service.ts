import { IUserRepository } from '../repositories/interfaces';
import { SafeUser } from '../types/auth';
import { UserRecord } from '../types/domain';
import { NotFoundError, ValidationError } from '../errors/AppError';
import { z } from 'zod';

const updateProfileSchema = z.object({
  fullName: z.string().trim().min(1).max(255).optional()
});

export class UserService {
  constructor(private readonly userRepository: IUserRepository) {}

  async getProfile(userId: string): Promise<SafeUser> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User');
    }
    return this.toSafeUser(user);
  }

  async updateProfile(userId: string, input: { fullName?: string }): Promise<SafeUser> {
    const parsed = updateProfileSchema.safeParse(input);
    if (!parsed.success) {
      throw new ValidationError('Invalid profile data', parsed.error.flatten());
    }
    const user = await this.userRepository.updateProfile(userId, parsed.data);
    return this.toSafeUser(user);
  }

  private toSafeUser(user: UserRecord): SafeUser {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      createdAt: user.createdAt
    };
  }
}
