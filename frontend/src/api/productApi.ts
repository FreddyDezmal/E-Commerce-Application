import { apiClient } from './client';
import type {
  CreateProductRequest,
  PagedResult,
  Product,
  ProductQueryParameters,
  UpdateProductRequest,
} from '../types/api';

export const productApi = {
  list: (query: ProductQueryParameters = {}) =>
    apiClient.get<PagedResult<Product>>('/api/products', { ...query }, false),
  getById: (id: string) => apiClient.get<Product>(`/api/products/${id}`, undefined, false),
  create: (data: CreateProductRequest) => apiClient.post<Product>('/api/products', data),
  update: (id: string, data: UpdateProductRequest) =>
    apiClient.put<Product>(`/api/products/${id}`, data),
  deactivate: (id: string) => apiClient.delete<void>(`/api/products/${id}`),
};
