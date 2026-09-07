import { apiClient } from './client';
import type { UpdateProfileRequest, User } from '../types/api';

export const userApi = {
  getMe: () => apiClient.get<User>('/api/users/me'),
  updateMe: (data: UpdateProfileRequest) => apiClient.put<User>('/api/users/me', data),
};
