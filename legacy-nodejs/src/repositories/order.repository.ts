import { Prisma, PrismaClient } from '@prisma/client';
import { prisma } from '../config/database';
import { CreateOrderInput, IOrderRepository } from './interfaces';
import { OrderRecord, OrderStatus } from '../types/domain';

type TransactionClient = Prisma.TransactionClient;

export class OrderRepository implements IOrderRepository {
  constructor(private readonly client: PrismaClient = prisma) {}

  /**
   * Atomic checkout: creates the order + order items,
   * decrements stock for each product, and clears the cart; all inside a
   * single Prisma transaction. If any step fails, the whole transaction
   * rolls back and no partial order is left behind.
   */
  async createFromCart(input: CreateOrderInput): Promise<OrderRecord> {
    const order = await this.client.$transaction(async (tx: TransactionClient) => {
      const created = await tx.order.create({
        data: {
          userId: input.userId,
          shippingAddressId: input.shippingAddressId,
          totalAmount: input.totalAmount,
          status: 'pending',
          items: {
            create: input.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPriceAtPurchase: item.unitPriceAtPurchase
            }))
          }
        },
        include: { items: true }
      });

      for (const item of input.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stockQuantity: { decrement: item.quantity } }
        });
      }

      const cart = await tx.cart.findUnique({ where: { userId: input.userId } });
      if (cart) {
        await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
      }

      return created;
    });

    return this.toDomain(order);
  }

  async findById(id: string): Promise<OrderRecord | null> {
    const row = await this.client.order.findUnique({ where: { id }, include: { items: true } });
    return row ? this.toDomain(row) : null;
  }

  async findByUser(userId: string, page: number, limit: number): Promise<{ items: OrderRecord[]; total: number }> {
    const [rows, total] = await Promise.all([
      this.client.order.findMany({
        where: { userId },
        include: { items: true },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      this.client.order.count({ where: { userId } })
    ]);
    return { items: rows.map(this.toDomain), total };
  }

  async findAll(page: number, limit: number, status?: OrderStatus): Promise<{ items: OrderRecord[]; total: number }> {
    const where = status ? { status } : {};
    const [rows, total] = await Promise.all([
      this.client.order.findMany({
        where,
        include: { items: true },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      this.client.order.count({ where })
    ]);
    return { items: rows.map(this.toDomain), total };
  }

  async updateStatus(id: string, status: OrderStatus): Promise<OrderRecord> {
    const row = await this.client.order.update({
      where: { id },
      data: { status },
      include: { items: true }
    });
    return this.toDomain(row);
  }

  private toDomain(row: any): OrderRecord {
    return {
      id: row.id,
      userId: row.userId,
      status: row.status,
      totalAmount: Number(row.totalAmount),
      shippingAddressId: row.shippingAddressId,
      createdAt: row.createdAt,
      items: (row.items ?? []).map((item: any) => ({
        id: item.id,
        orderId: item.orderId,
        productId: item.productId,
        quantity: item.quantity,
        unitPriceAtPurchase: Number(item.unitPriceAtPurchase)
      }))
    };
  }
}
