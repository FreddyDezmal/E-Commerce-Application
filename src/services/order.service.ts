import { ICartRepository, IOrderRepository, IProductRepository } from '../repositories/interfaces';
import { OrderRecord, OrderStatus } from '../types/domain';
import { Role } from '../types/auth';
import { ForbiddenError, NotFoundError, ValidationError } from '../errors/AppError';

/**
 * Allowed order status transitions (Milestone 1 §10 / Milestone 2 §26).
 * A transition is valid only if `to` appears in `ALLOWED_TRANSITIONS[from]`.
 */
const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ['paid', 'cancelled'],
  paid: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: []
};

export class OrderService {
  constructor(
    private readonly orderRepository: IOrderRepository,
    private readonly cartRepository: ICartRepository,
    private readonly productRepository: IProductRepository
  ) {}

  /**
   * Checkout: cart -> order. Re-validates cart contents and current stock
   * before delegating the actual atomic write (order + items + stock
   * decrement + cart clear) to the repository's transaction
   * (Milestone 2 §25). This method contains the *business rules*; the
   * repository contains the *atomicity mechanism*.
   */
  async checkout(userId: string, shippingAddressId: string | null): Promise<OrderRecord> {
    const cart = await this.cartRepository.findOrCreateByUser(userId);

    if (cart.items.length === 0) {
      throw new ValidationError('Cannot checkout with an empty cart');
    }

    let totalAmount = 0;
    const orderItems: Array<{ productId: string; quantity: number; unitPriceAtPurchase: number }> = [];

    for (const cartItem of cart.items) {
      const product = await this.productRepository.findById(cartItem.productId);
      if (!product || !product.isActive) {
        throw new NotFoundError(`Product ${cartItem.productId}`);
      }
      if (cartItem.quantity > product.stockQuantity) {
        throw new ValidationError(
          `"${product.name}" only has ${product.stockQuantity} unit(s) in stock`
        );
      }
      totalAmount += product.price * cartItem.quantity;
      orderItems.push({
        productId: product.id,
        quantity: cartItem.quantity,
        unitPriceAtPurchase: product.price
      });
    }

    return this.orderRepository.createFromCart({
      userId,
      shippingAddressId,
      totalAmount: Math.round(totalAmount * 100) / 100,
      items: orderItems
    });
  }

  async getOrderForUser(orderId: string, requesterId: string, requesterRole: Role): Promise<OrderRecord> {
    const order = await this.orderRepository.findById(orderId);
    if (!order) {
      throw new NotFoundError('Order');
    }
    // Ownership check (Milestone 1 §17): role alone is insufficient — a
    // customer may only view their own order, regardless of authentication.
    if (requesterRole !== 'admin' && order.userId !== requesterId) {
      throw new ForbiddenError('You do not have access to this order');
    }
    return order;
  }

  async listOrdersForUser(userId: string, page: number, limit: number) {
    return this.orderRepository.findByUser(userId, page, limit);
  }

  async listAllOrders(page: number, limit: number, status?: OrderStatus) {
    return this.orderRepository.findAll(page, limit, status);
  }

  async updateStatus(orderId: string, nextStatus: OrderStatus): Promise<OrderRecord> {
    const order = await this.orderRepository.findById(orderId);
    if (!order) {
      throw new NotFoundError('Order');
    }

    const allowed = ALLOWED_TRANSITIONS[order.status];
    if (!allowed.includes(nextStatus)) {
      throw new ValidationError(`Cannot transition order from '${order.status}' to '${nextStatus}'`);
    }

    return this.orderRepository.updateStatus(orderId, nextStatus);
  }
}
