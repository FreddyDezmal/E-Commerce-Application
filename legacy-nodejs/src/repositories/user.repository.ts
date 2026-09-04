import { PrismaClient } from '@prisma/client';
import { prisma } from '../config/database';
import { IUserRepository } from './interfaces';
import { UserRecord, Role } from '../types/domain';

// The ONLY layer permitted to issue Prisma queries for the User entity
export class UserRepository implements IUserRepository {
  constructor(private readonly client: PrismaClient = prisma) {}

  async findByEmail(email: string): Promise<UserRecord | null> {
    const user = await this.client.user.findUnique({ where: { email } });
    return user ? this.toDomain(user) : null;
  }

  async findById(id: string): Promise<UserRecord | null> {
    const user = await this.client.user.findUnique({ where: { id } });
    return user ? this.toDomain(user) : null;
  }

  async create(input: { email: string; passwordHash: string; fullName: string }): Promise<UserRecord> {
    const user = await this.client.user.create({
      data: {
        email: input.email,
        passwordHash: input.passwordHash,
        fullName: input.fullName
        // role intentionally omitted and it defaults to 'customer' at the schema
      }
    });
    return this.toDomain(user);
  }

  async updateProfile(id: string, data: { fullName?: string }): Promise<UserRecord> {
    const user = await this.client.user.update({ where: { id }, data });
    return this.toDomain(user);
  }

  private toDomain(row: any): UserRecord {
    return {
      id: row.id,
      email: row.email,
      passwordHash: row.passwordHash,
      fullName: row.fullName,
      role: row.role as Role,
      createdAt: row.createdAt
    };
  }
}
