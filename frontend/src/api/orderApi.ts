import { apiClient } from './client';
import type {
  CreateOrderRequest,
  Order,
  OrderQueryParameters,
  PagedResult,
  UpdateOrderStatusRequest,
} from '../types/api';

export const orderApi = {
  checkout: (data: CreateOrderRequest = {}) => apiClient.post<Order>('/api/orders', data),
  list: (query: OrderQueryParameters = {}) =>
    apiClient.get<PagedResult<Order>>('/api/orders', { ...query }),
  getById: (id: string) => apiClient.get<Order>(`/api/orders/${id}`),
  updateStatus: (id: string, data: UpdateOrderStatusRequest) =>
    apiClient.put<Order>(`/api/orders/${id}/status`, data),
};
