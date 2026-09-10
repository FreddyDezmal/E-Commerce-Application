import { apiClient } from './client';
import type {
  Category,
  CreateCategoryRequest,
} from '../types/api';

export const categoryApi = {
  list: () =>
    apiClient.get<Category[]>('/api/categories', undefined, false),

  create: (data: CreateCategoryRequest) =>
    apiClient.post<Category>('/api/categories', data),

  delete: (id: string) =>
    apiClient.delete<void>(`/api/categories/${id}`),
};
