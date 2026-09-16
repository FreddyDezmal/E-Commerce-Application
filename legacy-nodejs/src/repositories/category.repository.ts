import { PrismaClient } from '@prisma/client';
import { prisma } from '../config/database';
import { ICategoryRepository } from './interfaces';
import { CategoryRecord } from '../types/domain';

export class CategoryRepository implements ICategoryRepository {
  constructor(private readonly client: PrismaClient = prisma) {}

  async findAll(): Promise<CategoryRecord[]> {
    return this.client.category.findMany({ orderBy: { name: 'asc' } });
  }

  async findById(id: string): Promise<CategoryRecord | null> {
    return this.client.category.findUnique({ where: { id } });
  }

  async findByName(name: string): Promise<CategoryRecord | null> {
    return this.client.category.findUnique({ where: { name } });
  }

  async create(name: string): Promise<CategoryRecord> {
    return this.client.category.create({ data: { name } });
  }

  async hasProducts(categoryId: string): Promise<boolean> {
    const count = await this.client.product.count({ where: { categoryId, isActive: true } });
    return count > 0;
  }

  async delete(id: string): Promise<void> {
    await this.client.category.delete({ where: { id } });
  }
}
