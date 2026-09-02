import { Role } from './auth';

export type { Role };

// Domain-level shapes used by the Service layer

export interface UserRecord {
  id: string;
  email: string;
  passwordHash: string;
  fullName: string;
  role: Role;
  createdAt: Date;
}

export interface AddressRecord {
  id: string;
  userId: string;
  line1: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
}

export interface CategoryRecord {
  id: string;
  name: string;
}

export interface ProductRecord {
  id: string;
  name: string;
  description: string | null;
  price: number;
  stockQuantity: number;
  categoryId: string | null;
  isActive: boolean;
  createdAt: Date;
}

export interface CartItemRecord {
  id: string;
  cartId: string;
  productId: string;
  quantity: number;
}

export interface CartRecord {
  id: string;
  userId: string;
  items: CartItemRecord[];
}

export type OrderStatus = 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled';

export interface OrderItemRecord {
  id: string;
  orderId: string;
  productId: string;
  quantity: number;
  unitPriceAtPurchase: number;
}

export interface OrderRecord {
  id: string;
  userId: string;
  status: OrderStatus;
  totalAmount: number;
  shippingAddressId: string | null;
  createdAt: Date;
  items: OrderItemRecord[];
}
