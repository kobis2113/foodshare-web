import api, { BASE_URL } from './api';
import type { AuthResponse, LoginCredentials, RegisterCredentials, User } from '../types';

export const authService = {
  // Register new user
  register: async (credentials: RegisterCredentials): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/api/web/auth/register', credentials);
    return response.data;
  },

  // Login with email/password
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/api/web/auth/login', credentials);
    return response.data;
  },

  // Logout
  logout: async (): Promise<void> => {
    const refreshToken = localStorage.getItem('refreshToken');
    try {
      await api.post('/api/web/auth/logout', { refreshToken });
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    }
  },

  // Refresh token
  refreshToken: async (): Promise<AuthResponse> => {
    const refreshToken = localStorage.getItem('refreshToken');
    const response = await api.post<AuthResponse>('/api/web/auth/refresh', { refreshToken });
    return response.data;
  },

  // Get current user
  getCurrentUser: async (): Promise<User> => {
    const response = await api.get<User>('/api/users/me');
    return response.data;
  },

  // Google OAuth - redirect to Google
  googleLogin: (): void => {
    window.location.href = `${BASE_URL}/api/web/auth/google`;
  },

  // Save tokens to localStorage
  saveTokens: (accessToken: string, refreshToken: string): void => {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
  },

  // Check if user is authenticated
  isAuthenticated: (): boolean => {
    return !!localStorage.getItem('accessToken');
  },

  // Get stored access token
  getAccessToken: (): string | null => {
    return localStorage.getItem('accessToken');
  },
};

export default authService;
