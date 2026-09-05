import { OrderService } from '../../../src/services/order.service';
import {
  ICartRepository,
  IOrderRepository,
  IProductRepository
} from '../../../src/repositories/interfaces';
import {
  CartRecord,
  OrderRecord,
  ProductRecord
} from '../../../src/types/domain';

describe('OrderService', () => {
  const orderRepository: jest.Mocked<IOrderRepository> = {
    findById: jest.fn(),
    findByUser: jest.fn(),
    findAll: jest.fn(),
    createFromCart: jest.fn(),
    updateStatus: jest.fn()
  };

  const cartRepository: jest.Mocked<ICartRepository> = {
    findOrCreateByUser: jest.fn(),
    findItem: jest.fn(),
    addItem: jest.fn(),
    updateItemQuantity: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn()
  };

  const productRepository: jest.Mocked<IProductRepository> = {
    findMany: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    deactivate: jest.fn(),
    decrementStock: jest.fn()
  };

  const orderService = new OrderService(
    orderRepository,
    cartRepository,
    productRepository
  );

  const product: ProductRecord = {
    id: 'product-123',
    name: 'Test Product',
    description: 'A test product',
    price: 100,
    stockQuantity: 10,
    categoryId: 'category-123',
    isActive: true,
    createdAt: new Date()
  };

  const cart: CartRecord = {
    id: 'cart-123',
    userId: 'user-123',
    items: [
      {
        id: 'cart-item-123',
        cartId: 'cart-123',
        productId: 'product-123',
        quantity: 2
      }
    ]
  };

  const order: OrderRecord = {
    id: 'order-123',
    userId: 'user-123',
    status: 'pending',
    totalAmount: 200,
    shippingAddressId: 'address-123',
    createdAt: new Date(),
    items: [
      {
        id: 'order-item-123',
        orderId: 'order-123',
        productId: 'product-123',
        quantity: 2,
        unitPriceAtPurchase: 100
      }
    ]
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should checkout a cart successfully', async () => {
    cartRepository.findOrCreateByUser.mockResolvedValue(cart);
    productRepository.findById.mockResolvedValue(product);
    orderRepository.createFromCart.mockResolvedValue(order);

    const result = await orderService.checkout(
      'user-123',
      'address-123'
    );

    expect(cartRepository.findOrCreateByUser).toHaveBeenCalledWith(
      'user-123'
    );

    expect(productRepository.findById).toHaveBeenCalledWith(
      'product-123'
    );

    expect(orderRepository.createFromCart).toHaveBeenCalledWith({
      userId: 'user-123',
      shippingAddressId: 'address-123',
      totalAmount: 200,
      items: [
        {
          productId: 'product-123',
          quantity: 2,
          unitPriceAtPurchase: 100
        }
      ]
    });

    expect(result).toEqual(order);
  });

  it('should reject checkout when the cart is empty', async () => {
    cartRepository.findOrCreateByUser.mockResolvedValue({
      ...cart,
      items: []
    });

    await expect(
      orderService.checkout('user-123', 'address-123')
    ).rejects.toThrow('Cannot checkout with an empty cart');

    expect(productRepository.findById).not.toHaveBeenCalled();
    expect(orderRepository.createFromCart).not.toHaveBeenCalled();
  });

  it('should reject checkout when a product does not exist', async () => {
    cartRepository.findOrCreateByUser.mockResolvedValue(cart);
    productRepository.findById.mockResolvedValue(null);

    await expect(
      orderService.checkout('user-123', 'address-123')
    ).rejects.toThrow('Product product-123');

    expect(orderRepository.createFromCart).not.toHaveBeenCalled();
  });

  it('should reject checkout when a product is inactive', async () => {
    cartRepository.findOrCreateByUser.mockResolvedValue(cart);
    productRepository.findById.mockResolvedValue({
      ...product,
      isActive: false
    });

    await expect(
      orderService.checkout('user-123', 'address-123')
    ).rejects.toThrow('Product product-123');

    expect(orderRepository.createFromCart).not.toHaveBeenCalled();
  });

  it('should reject checkout when there is insufficient stock', async () => {
    cartRepository.findOrCreateByUser.mockResolvedValue(cart);
    productRepository.findById.mockResolvedValue({
      ...product,
      stockQuantity: 1
    });

    await expect(
      orderService.checkout('user-123', 'address-123')
    ).rejects.toThrow('only has 1 unit(s) in stock');

    expect(orderRepository.createFromCart).not.toHaveBeenCalled();
  });

  it('should calculate the checkout total correctly', async () => {
    const multiItemCart: CartRecord = {
      ...cart,
      items: [
        {
          id: 'cart-item-1',
          cartId: 'cart-123',
          productId: 'product-123',
          quantity: 2
        },
        {
          id: 'cart-item-2',
          cartId: 'cart-123',
          productId: 'product-123',
          quantity: 3
        }
      ]
    };

    cartRepository.findOrCreateByUser.mockResolvedValue(multiItemCart);
    productRepository.findById.mockResolvedValue(product);
    orderRepository.createFromCart.mockResolvedValue(order);

    await orderService.checkout('user-123', null);

    expect(orderRepository.createFromCart).toHaveBeenCalledWith({
      userId: 'user-123',
      shippingAddressId: null,
      totalAmount: 500,
      items: [
        {
          productId: 'product-123',
          quantity: 2,
          unitPriceAtPurchase: 100
        },
        {
          productId: 'product-123',
          quantity: 3,
          unitPriceAtPurchase: 100
        }
      ]
    });
  });

  it('should allow a customer to view their own order', async () => {
    orderRepository.findById.mockResolvedValue(order);

    const result = await orderService.getOrderForUser(
      'order-123',
      'user-123',
      'customer'
    );

    expect(orderRepository.findById).toHaveBeenCalledWith(
      'order-123'
    );

    expect(result).toEqual(order);
  });

  it('should allow an admin to view any order', async () => {
    orderRepository.findById.mockResolvedValue(order);

    const result = await orderService.getOrderForUser(
      'order-123',
      'different-user',
      'admin'
    );

    expect(result).toEqual(order);
  });

  it('should reject viewing an order that does not exist', async () => {
    orderRepository.findById.mockResolvedValue(null);

    await expect(
      orderService.getOrderForUser(
        'unknown-order',
        'user-123',
        'customer'
      )
    ).rejects.toThrow('Order');
  });

  it('should reject a customer viewing another customer’s order', async () => {
    orderRepository.findById.mockResolvedValue(order);

    await expect(
      orderService.getOrderForUser(
        'order-123',
        'different-user',
        'customer'
      )
    ).rejects.toThrow('You do not have access to this order');
  });

  it('should list orders for a user', async () => {
    const result = {
      items: [order],
      total: 1
    };

    orderRepository.findByUser.mockResolvedValue(result);

    const response = await orderService.listOrdersForUser(
      'user-123',
      1,
      10
    );

    expect(orderRepository.findByUser).toHaveBeenCalledWith(
      'user-123',
      1,
      10
    );

    expect(response).toEqual(result);
  });

  it('should list all orders', async () => {
    const result = {
      items: [order],
      total: 1
    };

    orderRepository.findAll.mockResolvedValue(result);

    const response = await orderService.listAllOrders(
      1,
      10
    );

    expect(orderRepository.findAll).toHaveBeenCalledWith(
      1,
      10,
      undefined
    );

    expect(response).toEqual(result);
  });

  it('should list all orders filtered by status', async () => {
    const result = {
      items: [order],
      total: 1
    };

    orderRepository.findAll.mockResolvedValue(result);

    const response = await orderService.listAllOrders(
      1,
      10,
      'pending'
    );

    expect(orderRepository.findAll).toHaveBeenCalledWith(
      1,
      10,
      'pending'
    );

    expect(response).toEqual(result);
  });

  it('should update an order status using a valid transition', async () => {
    const updatedOrder: OrderRecord = {
      ...order,
      status: 'paid'
    };

    orderRepository.findById.mockResolvedValue(order);
    orderRepository.updateStatus.mockResolvedValue(updatedOrder);

    const result = await orderService.updateStatus(
      'order-123',
      'paid'
    );

    expect(orderRepository.findById).toHaveBeenCalledWith(
      'order-123'
    );

    expect(orderRepository.updateStatus).toHaveBeenCalledWith(
      'order-123',
      'paid'
    );

    expect(result).toEqual(updatedOrder);
  });

  it('should reject updating an order that does not exist', async () => {
    orderRepository.findById.mockResolvedValue(null);

    await expect(
      orderService.updateStatus('unknown-order', 'paid')
    ).rejects.toThrow('Order');

    expect(orderRepository.updateStatus).not.toHaveBeenCalled();
  });

  it('should reject an invalid order status transition', async () => {
    orderRepository.findById.mockResolvedValue(order);

    await expect(
      orderService.updateStatus('order-123', 'delivered')
    ).rejects.toThrow(
      "Cannot transition order from 'pending' to 'delivered'"
    );

    expect(orderRepository.updateStatus).not.toHaveBeenCalled();
  });

  it('should reject changing a delivered order to another status', async () => {
    const deliveredOrder: OrderRecord = {
      ...order,
      status: 'delivered'
    };

    orderRepository.findById.mockResolvedValue(deliveredOrder);

    await expect(
      orderService.updateStatus('order-123', 'cancelled')
    ).rejects.toThrow(
      "Cannot transition order from 'delivered' to 'cancelled'"
    );

    expect(orderRepository.updateStatus).not.toHaveBeenCalled();
  });
});