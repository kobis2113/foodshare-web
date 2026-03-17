/**
 * Application Constants
 * All configurable values should be defined here
 */

// API Configuration
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// App Settings
export const APP_NAME = import.meta.env.VITE_APP_NAME || 'FoodShare';
export const POSTS_PER_PAGE = parseInt(import.meta.env.VITE_POSTS_PER_PAGE || '10', 10);

// Validation Limits
export const VALIDATION = {
  MEAL_NAME: {
    MIN_LENGTH: 1,
    MAX_LENGTH: parseInt(import.meta.env.VITE_MAX_MEAL_NAME_LENGTH || '100', 10),
  },
  DESCRIPTION: {
    MAX_LENGTH: parseInt(import.meta.env.VITE_MAX_DESCRIPTION_LENGTH || '500', 10),
  },
  COMMENT: {
    MIN_LENGTH: 1,
    MAX_LENGTH: parseInt(import.meta.env.VITE_MAX_COMMENT_LENGTH || '500', 10),
  },
  SEARCH_QUERY: {
    MIN_LENGTH: 2,
    MAX_LENGTH: 200,
  },
} as const;

// Image Upload
export const IMAGE_UPLOAD = {
  MAX_SIZE_MB: parseInt(import.meta.env.VITE_MAX_IMAGE_SIZE_MB || '5', 10),
  MAX_SIZE_BYTES: parseInt(import.meta.env.VITE_MAX_IMAGE_SIZE_MB || '5', 10) * 1024 * 1024,
  ALLOWED_TYPES: (import.meta.env.VITE_ALLOWED_IMAGE_TYPES || 'image/jpeg,image/jpg,image/png,image/gif,image/webp').split(','),
} as const;

// Nutrition Thresholds (for display and tips)
export const NUTRITION_THRESHOLDS = {
  HIGH_PROTEIN: 20,
  LOW_PROTEIN: 10,
  LOW_CALORIE: 300,
  HIGH_CALORIE: 600,
  HIGH_SUGAR: 20,
  BALANCED_PROTEIN: 15,
  BALANCED_CARBS: 20,
  BALANCED_FAT: 10,
} as const;

// UI Constants
export const UI = {
  TOAST_DURATION: 3000,
  DEBOUNCE_DELAY: 300,
  ICON_SIZE: {
    SMALL: 16,
    MEDIUM: 20,
    LARGE: 24,
  },
} as const;

// Local Storage Keys
export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'accessToken',
  REFRESH_TOKEN: 'refreshToken',
  USER: 'user',
} as const;

// Routes
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  PROFILE: '/profile',
  MY_POSTS: '/my-posts',
  LIKED_POSTS: '/liked',
  CREATE_POST: '/create',
  POST_DETAIL: '/post/:id',
  EDIT_POST: '/post/:id/edit',
  EDIT_PROFILE: '/profile/edit',
} as const;
