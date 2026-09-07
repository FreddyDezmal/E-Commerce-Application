// These types mirror the actual ASP.NET Core DTOs in src/DTOs/**.
// Do not add fields the backend doesn't return — see Milestone 3 Audit.

// The backend lowercases the Role enum before serializing
// (see UserService.Map / AuthService — user.Role.ToString().ToLowerInvariant()),
// so the wire format is 'admin'/'customer', not the C# enum's 'Admin'/'Customer'.
export type Role = 'customer' | 'admin';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  createdAt: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  fullName: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface UpdateProfileRequest {
  fullName?: string;
}

export interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  stockQuantity: number;
  categoryId: string | null;
  isDeleted: boolean;
  createdAt: string;
}

export interface CreateProductRequest {
  name: string;
  description?: string;
  price: number;
  stockQuantity: number;
  categoryId?: string | null;
}

// Partial-update (PATCH-semantics) DTO — only send fields that changed.
export type UpdateProductRequest = Partial<CreateProductRequest>;

export interface ProductQueryParameters {
  search?: string;
  category?: string;
  page?: number;
  limit?: number;
}

export interface PagedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

export interface Category {
  id: string;
  name: string;
}

export interface CreateCategoryRequest {
  name: string;
}

// NOTE: the backend has an UpdateCategoryRequest DTO but no PUT route wired
// up in CategoriesController — category rename is not currently supported
// end-to-end. See Milestone 3 Audit.

export interface CartItem {
  id: string;
  productId: string;
  productName: string;
  unitPrice: number;
  quantity: number;
}

export interface Cart {
  id: string;
  userId: string;
  items: CartItem[];
  subtotal: number;
}

export interface AddCartItemRequest {
  productId: string;
  quantity: number;
}

export interface UpdateCartItemRequest {
  quantity: number;
}

export type OrderStatus = 'Pending' | 'Paid' | 'Shipped' | 'Delivered' | 'Cancelled';

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPriceAtPurchase: number;
}

export interface Order {
  id: string;
  userId: string;
  status: string;
  totalAmount: number;
  shippingAddressId: string | null;
  createdAt: string;
  items: OrderItem[];
}

export interface CreateOrderRequest {
  shippingAddressId?: string | null;
}

export interface OrderQueryParameters {
  page?: number;
  limit?: number;
  status?: string;
}

export interface UpdateOrderStatusRequest {
  status: string;
}

// Shape of the ProblemDetails-style error body written by
// ExceptionHandlingMiddleware in the backend.
export interface ApiProblemDetails {
  status: number;
  title: string;
  detail: string;
  code?: string;
  details?: unknown;
}