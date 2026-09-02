import { ICategoryRepository, IProductRepository, ProductFilter } from '../repositories/interfaces';
import { ProductRecord } from '../types/domain';
import { NotFoundError, ValidationError } from '../errors/AppError';
import { createProductSchema, updateProductSchema } from '../validators/product.validators';

export class ProductService {
  constructor(
    private readonly productRepository: IProductRepository,
    // Retained for future category-existence checks on create/update;
    // not yet required by any test, kept minimal rather than unused-but-injected
    // speculative behaviour (Milestone 2 §29 — no unnecessary abstractions).
    private readonly categoryRepository: ICategoryRepository
  ) {}

  async listProducts(filter: ProductFilter) {
    return this.productRepository.findMany(filter);
  }

  async getProduct(id: string): Promise<ProductRecord> {
    const product = await this.productRepository.findById(id);
    if (!product || !product.isActive) {
      throw new NotFoundError('Product');
    }
    return product;
  }

  async createProduct(input: {
    name: string;
    description: string | null;
    price: number;
    stockQuantity: number;
    categoryId: string | null;
  }): Promise<ProductRecord> {
    const parsed = createProductSchema.safeParse(input);
    if (!parsed.success) {
      throw new ValidationError('Invalid product data', parsed.error.flatten());
    }

    if (parsed.data.categoryId) {
      const category = await this.categoryRepository.findById(parsed.data.categoryId);
      if (!category) {
        throw new NotFoundError('Category');
      }
    }

    return this.productRepository.create({
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      price: parsed.data.price,
      stockQuantity: parsed.data.stockQuantity,
      categoryId: parsed.data.categoryId ?? null
    });
  }

  async updateProduct(id: string, input: Partial<Omit<ProductRecord, 'id' | 'createdAt'>>): Promise<ProductRecord> {
    const existing = await this.productRepository.findById(id);
    if (!existing) {
      throw new NotFoundError('Product');
    }

    const parsed = updateProductSchema.safeParse(input);
    if (!parsed.success) {
      throw new ValidationError('Invalid product data', parsed.error.flatten());
    }

    return this.productRepository.update(id, parsed.data);
  }

  async deactivateProduct(id: string): Promise<ProductRecord> {
    const existing = await this.productRepository.findById(id);
    if (!existing) {
      throw new NotFoundError('Product');
    }
    return this.productRepository.deactivate(id);
  }
}
