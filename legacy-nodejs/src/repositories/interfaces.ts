import {
  AddressRecord,
  CartRecord,
  CategoryRecord,
  OrderRecord,
  OrderStatus,
  ProductRecord,
  UserRecord
} from '../types/domain';

export interface IUserRepository {
  findByEmail(email: string): Promise<UserRecord | null>;
  findById(id: string): Promise<UserRecord | null>;
  create(input: { email: string; passwordHash: string; fullName: string }): Promise<UserRecord>;
  updateProfile(id: string, data: { fullName?: string }): Promise<UserRecord>;
}

export interface IAddressRepository {
  findById(id: string): Promise<AddressRecord | null>;
  findByUser(userId: string): Promise<AddressRecord[]>;
  create(input: Omit<AddressRecord, 'id'>): Promise<AddressRecord>;
}

export interface ICategoryRepository {
  findAll(): Promise<CategoryRecord[]>;
  findById(id: string): Promise<CategoryRecord | null>;
  findByName(name: string): Promise<CategoryRecord | null>;
  create(name: string): Promise<CategoryRecord>;
  hasProducts(categoryId: string): Promise<boolean>;
  delete(id: string): Promise<void>;
}

export interface ProductFilter {
  search?: string;
  categoryId?: string;
  page?: number;
  limit?: number;
}

export interface IProductRepository {
  findMany(filter: ProductFilter): Promise<{ items: ProductRecord[]; total: number }>;
  findById(id: string): Promise<ProductRecord | null>;
  create(input: Omit<ProductRecord, 'id' | 'createdAt' | 'isActive'>): Promise<ProductRecord>;
  update(id: string, data: Partial<Omit<ProductRecord, 'id' | 'createdAt'>>): Promise<ProductRecord>;
  deactivate(id: string): Promise<ProductRecord>;
  decrementStock(productId: string, quantity: number): Promise<void>;
}

export interface ICartRepository {
  findOrCreateByUser(userId: string): Promise<CartRecord>;
  findItem(cartId: string, productId: string): Promise<{ id: string; quantity: number } | null>;
  addItem(cartId: string, productId: string, quantity: number): Promise<CartRecord>;
  updateItemQuantity(cartId: string, itemId: string, quantity: number): Promise<CartRecord>;
  removeItem(cartId: string, itemId: string): Promise<CartRecord>;
  clear(cartId: string): Promise<void>;
}

export interface CreateOrderInput {
  userId: string;
  shippingAddressId: string | null;
  totalAmount: number;
  items: Array<{ productId: string; quantity: number; unitPriceAtPurchase: number }>;
}

export interface IOrderRepository {
  createFromCart(input: CreateOrderInput): Promise<OrderRecord>;
  findById(id: string): Promise<OrderRecord | null>;
  findByUser(userId: string, page: number, limit: number): Promise<{ items: OrderRecord[]; total: number }>;
  findAll(page: number, limit: number, status?: OrderStatus): Promise<{ items: OrderRecord[]; total: number }>;
  updateStatus(id: string, status: OrderStatus): Promise<OrderRecord>;
}
