import { ICategoryRepository } from '../repositories/interfaces';
import { CategoryRecord } from '../types/domain';
import { ConflictError, NotFoundError, ValidationError } from '../errors/AppError';
import { createCategorySchema } from '../validators/product.validators';

export class CategoryService {
  constructor(private readonly categoryRepository: ICategoryRepository) {}

  async listCategories(): Promise<CategoryRecord[]> {
    return this.categoryRepository.findAll();
  }

  async createCategory(input: { name: string }): Promise<CategoryRecord> {
    const parsed = createCategorySchema.safeParse(input);
    if (!parsed.success) {
      throw new ValidationError('Invalid category data', parsed.error.flatten());
    }

    const existing = await this.categoryRepository.findByName(parsed.data.name);
    if (existing) {
      throw new ConflictError('A category with this name already exists');
    }

    return this.categoryRepository.create(parsed.data.name);
  }

  /**
   * Category deletion is blocked if any active product still references it
   * (Milestone 1 §11 — "Category deletion blocked if products reference it").
   */
  async deleteCategory(id: string): Promise<void> {
    const category = await this.categoryRepository.findById(id);
    if (!category) {
      throw new NotFoundError('Category');
    }

    const hasProducts = await this.categoryRepository.hasProducts(id);
    if (hasProducts) {
      throw new ConflictError('Cannot delete a category that still has active products');
    }

    await this.categoryRepository.delete(id);
  }
}
