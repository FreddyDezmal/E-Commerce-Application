import { PrismaClient } from '@prisma/client';
import { prisma } from '../config/database';
import { ICartRepository } from './interfaces';
import { CartRecord } from '../types/domain';

export class CartRepository implements ICartRepository {
  constructor(private readonly client: PrismaClient = prisma) {}

  async findOrCreateByUser(userId: string): Promise<CartRecord> {
    const cart = await this.client.cart.upsert({
      where: { userId },
      update: {},
      create: { userId },
      include: { items: true }
    });
    return this.toDomain(cart);
  }

  async findItem(cartId: string, productId: string): Promise<{ id: string; quantity: number } | null> {
    const item = await this.client.cartItem.findUnique({
      where: { cartId_productId: { cartId, productId } }
    });
    return item ? { id: item.id, quantity: item.quantity } : null;
  }

  async addItem(cartId: string, productId: string, quantity: number): Promise<CartRecord> {
    await this.client.cartItem.create({ data: { cartId, productId, quantity } });
    return this.getCart(cartId);
  }

  async updateItemQuantity(cartId: string, itemId: string, quantity: number): Promise<CartRecord> {
    await this.client.cartItem.update({ where: { id: itemId }, data: { quantity } });
    return this.getCart(cartId);
  }

  async removeItem(cartId: string, itemId: string): Promise<CartRecord> {
    await this.client.cartItem.delete({ where: { id: itemId } });
    return this.getCart(cartId);
  }

  async clear(cartId: string): Promise<void> {
    await this.client.cartItem.deleteMany({ where: { cartId } });
  }

  private async getCart(cartId: string): Promise<CartRecord> {
    const cart = await this.client.cart.findUniqueOrThrow({
      where: { id: cartId },
      include: { items: true }
    });
    return this.toDomain(cart);
  }

  private toDomain(row: any): CartRecord {
    return {
      id: row.id,
      userId: row.userId,
      items: (row.items ?? []).map((item: any) => ({
        id: item.id,
        cartId: item.cartId,
        productId: item.productId,
        quantity: item.quantity
      }))
    };
  }
}
