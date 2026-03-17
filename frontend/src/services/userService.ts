import api from './api';
import type { User } from '../types';

export const userService = {
  // Get current user profile
  getMyProfile: async (): Promise<User> => {
    const response = await api.get<User>('/api/users/me');
    return response.data;
  },

  // Update profile
  updateProfile: async (formData: FormData): Promise<{ message: string; user: User }> => {
    const response = await api.put<{ message: string; user: User }>('/api/users/me', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Get user by ID
  getUserById: async (userId: string): Promise<User> => {
    const response = await api.get<User>(`/api/users/${userId}`);
    return response.data;
  },
};

export default userService;
