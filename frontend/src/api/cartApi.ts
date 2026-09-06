import { apiClient } from './client';
import type { AddCartItemRequest, Cart, UpdateCartItemRequest } from '../types/api';

export const cartApi = {
  get: () => apiClient.get<Cart>('/api/cart'),
  addItem: (data: AddCartItemRequest) => apiClient.post<Cart>('/api/cart/items', data),
  updateItem: (productId: string, data: UpdateCartItemRequest) =>
    apiClient.put<Cart>(`/api/cart/items/${productId}`, data),
  removeItem: (productId: string) => apiClient.delete<void>(`/api/cart/items/${productId}`),
};
