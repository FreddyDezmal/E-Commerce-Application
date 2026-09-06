import { apiClient } from './client';
import type { AuthResponse, LoginRequest, RegisterRequest } from '../types/api';

export const authApi = {
  register: (data: RegisterRequest) =>
    apiClient.post<AuthResponse>('/api/auth/register', data, false),
  login: (data: LoginRequest) => apiClient.post<AuthResponse>('/api/auth/login', data, false),
};
