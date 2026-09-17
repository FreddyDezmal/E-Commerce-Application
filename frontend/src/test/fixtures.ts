import type { Cart, CartItem, Category, Order, OrderItem, Product, User } from '../types/api';

// Test data mirroring the shapes in src/types/api.ts. Values are realistic for
// the Ledger & Co. domain (ZAR prices, South African-style names) but entirely
// invented, no production customers, tokens or credentials appear here.

export function createMockUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    email: 'thandi@example.test',
    fullName: 'Thandi Nkosi',
    role: 'customer',
    createdAt: '2026-01-05T09:00:00.000Z',
    ...overrides,
  };
}

export function createMockAdminUser(overrides: Partial<User> = {}): User {
  return createMockUser({
    id: 'admin-1',
    email: 'admin@example.test',
    fullName: 'Sipho Admin',
    role: 'admin',
    ...overrides,
  });
}

export function createMockProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 'product-1',
    name: 'Ceramic Mug',
    description: 'A stoneware mug that holds 350ml.',
    price: 120,
    stockQuantity: 5,
    categoryId: 'category-1',
    isDeleted: false,
    createdAt: '2026-01-10T09:00:00.000Z',
    ...overrides,
  };
}

export function createMockCategory(overrides: Partial<Category> = {}): Category {
  return { id: 'category-1', name: 'Kitchen', ...overrides };
}

export function createMockCartItem(overrides: Partial<CartItem> = {}): CartItem {
  return {
    id: 'cart-item-1',
    productId: 'product-1',
    productName: 'Ceramic Mug',
    unitPrice: 120,
    quantity: 2,
    ...overrides,
  };
}

// `subtotal` is whatever the caller passes, because the real API calculates it
// server-side. Tests that assert on totals should set it explicitly rather than
// letting a helper compute it, otherwise the test would just be re-implementing
// the server's arithmetic and could never catch a client-side total creeping in.
export function createMockCart(overrides: Partial<Cart> = {}): Cart {
  return {
    id: 'cart-1',
    userId: 'user-1',
    items: [createMockCartItem()],
    subtotal: 240,
    ...overrides,
  };
}

export function createMockEmptyCart(overrides: Partial<Cart> = {}): Cart {
  return createMockCart({ items: [], subtotal: 0, ...overrides });
}

export function createMockOrderItem(overrides: Partial<OrderItem> = {}): OrderItem {
  return {
    id: 'order-item-1',
    productId: 'product-1',
    productName: 'Ceramic Mug',
    quantity: 2,
    unitPriceAtPurchase: 120,
    ...overrides,
  };
}

export function createMockOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: 'order-1a2b3c4d-0000-0000-0000-000000000000',
    userId: 'user-1',
    status: 'Pending',
    totalAmount: 240,
    shippingAddressId: null,
    createdAt: '2026-02-14T10:30:00.000Z',
    items: [createMockOrderItem()],
    ...overrides,
  };
}

export function createMockPagedResult<T>(
  items: T[],
  overrides: { total?: number; page?: number; limit?: number } = {}
) {
  return {
    items,
    total: overrides.total ?? items.length,
    page: overrides.page ?? 1,
    limit: overrides.limit ?? 12,
  };
}
