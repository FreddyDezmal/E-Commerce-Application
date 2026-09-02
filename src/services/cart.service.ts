import { ICartRepository, IProductRepository } from '../repositories/interfaces';
import { CartRecord } from '../types/domain';
import { NotFoundError, ValidationError } from '../errors/AppError';

export class CartService {
  constructor(
    private readonly cartRepository: ICartRepository,
    private readonly productRepository: IProductRepository
  ) {}

  async getCart(userId: string): Promise<CartRecord> {
    return this.cartRepository.findOrCreateByUser(userId);
  }

  async addItem(userId: string, productId: string, quantity: number): Promise<CartRecord> {
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new ValidationError('Quantity must be a positive integer');
    }

    const cart = await this.cartRepository.findOrCreateByUser(userId);

    const product = await this.productRepository.findById(productId);
    if (!product || !product.isActive) {
      throw new NotFoundError('Product');
    }

    const existing = await this.cartRepository.findItem(cart.id, productId);
    const desiredQuantity = (existing?.quantity ?? 0) + quantity;

    if (desiredQuantity > product.stockQuantity) {
      throw new ValidationError(
        `Only ${product.stockQuantity} unit(s) of "${product.name}" are available`
      );
    }

    if (existing) {
      return this.cartRepository.updateItemQuantity(cart.id, existing.id, desiredQuantity);
    }
    return this.cartRepository.addItem(cart.id, productId, quantity);
  }

  async updateItemQuantity(userId: string, itemId: string, quantity: number): Promise<CartRecord> {
    if (!Number.isInteger(quantity) || quantity < 0) {
      throw new ValidationError('Quantity must be zero or a positive integer');
    }

    const cart = await this.cartRepository.findOrCreateByUser(userId);
    const item = cart.items.find((i) => i.id === itemId);
    if (!item) {
      throw new NotFoundError('Cart item');
    }

    if (quantity === 0) {
      return this.cartRepository.removeItem(cart.id, itemId);
    }

    const product = await this.productRepository.findById(item.productId);
    if (!product || !product.isActive) {
      throw new NotFoundError('Product');
    }
    if (quantity > product.stockQuantity) {
      throw new ValidationError(`Only ${product.stockQuantity} unit(s) of "${product.name}" are available`);
    }

    return this.cartRepository.updateItemQuantity(cart.id, itemId, quantity);
  }

  async removeItem(userId: string, itemId: string): Promise<CartRecord> {
    const cart = await this.cartRepository.findOrCreateByUser(userId);
    const item = cart.items.find((i) => i.id === itemId);
    if (!item) {
      throw new NotFoundError('Cart item');
    }
    return this.cartRepository.removeItem(cart.id, itemId);
  }
}
