import { IUserRepository } from '../repositories/interfaces';
import { ConflictError, UnauthorizedError, ValidationError } from '../errors/AppError';
import { hashPassword, comparePassword } from '../utils/password';
import { signToken } from '../utils/jwt';
import { registerSchema, loginSchema } from '../validators/auth.validators';
import { SafeUser } from '../types/auth';
import { UserRecord } from '../types/domain';

export interface RegisterDTO {
  email: string;
  password: string;
  fullName: string;
}

export interface LoginDTO {
  email: string;
  password: string;
}

export interface AuthResult {
  user: SafeUser;
  token: string;
}

/**
 * Business logic for registration/login. Deliberately has no dependency on
 * Express request/response objects (Milestone 2 §4) and depends only on
 * the IUserRepository interface, not a concrete Prisma-backed class — so
 * it can be fully unit-tested with a mocked repository (Milestone 2 §23).
 */
export class AuthService {
  constructor(private readonly userRepository: IUserRepository) {}

  async register(input: RegisterDTO): Promise<AuthResult> {
    const parsed = registerSchema.safeParse(input);
    if (!parsed.success) {
      throw new ValidationError('Invalid registration input', parsed.error.flatten());
    }

    const existing = await this.userRepository.findByEmail(parsed.data.email);
    if (existing) {
      throw new ConflictError('An account with this email already exists');
    }

    const passwordHash = await hashPassword(parsed.data.password);
    const user = await this.userRepository.create({
      email: parsed.data.email,
      passwordHash,
      fullName: parsed.data.fullName
    });

    return this.buildResult(user);
  }

  async login(input: LoginDTO): Promise<AuthResult> {
    const parsed = loginSchema.safeParse(input);
    if (!parsed.success) {
      throw new ValidationError('Invalid login input', parsed.error.flatten());
    }

    const user = await this.userRepository.findByEmail(parsed.data.email);
    // Deliberately identical error/message for "no such user" and "wrong
    // password" (Milestone 2 §13) — do not let a client enumerate emails.
    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const passwordMatches = await comparePassword(parsed.data.password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedError('Invalid email or password');
    }

    return this.buildResult(user);
  }

  private buildResult(user: UserRecord): AuthResult {
    const token = signToken({ sub: user.id, role: user.role });
    const safeUser: SafeUser = {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      createdAt: user.createdAt
    };
    return { user: safeUser, token };
  }
}
