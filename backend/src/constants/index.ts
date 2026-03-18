/**
 * Backend Constants
 * All configurable values should be defined here
 */

// Server Configuration
export const SERVER = {
  DEFAULT_PORT: 3000,
  DEFAULT_HOST: '0.0.0.0',
} as const;

// Validation Limits
export const VALIDATION = {
  MEAL_NAME: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 100,
  },
  DESCRIPTION: {
    MAX_LENGTH: 500,
  },
  COMMENT: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 500,
  },
  SEARCH_QUERY: {
    MIN_LENGTH: 2,
    MAX_LENGTH: 200,
  },
  IMAGE_BASE64: {
    MIN_LENGTH: 100,
  },
  PREFERENCES: {
    MAX_LENGTH: 200,
  },
} as const;

// Pagination
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 50,
  SEARCH_LIMIT: 20,
} as const;

// Authentication
export const AUTH = {
  BCRYPT_SALT_ROUNDS: 10,
  JWT_DEFAULT_EXPIRY: '15m',
  REFRESH_TOKEN_EXPIRY: '7d',
} as const;

// Rate Limiting
export const RATE_LIMIT = {
  LOGIN: {
    WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    MAX_REQUESTS: 500,
    MESSAGE: 'Too many login attempts, please try again after 15 minutes',
  },
  GENERAL: {
    WINDOW_MS: 60 * 1000, // 1 minute
    MAX_REQUESTS: 2000,
    MESSAGE: 'Too many requests, please slow down',
  },
  AI: {
    REQUESTS_PER_MINUTE: 50,
    WINDOW_MS: 60 * 1000, // 1 minute
  },
} as const;

// Image Upload
export const IMAGE_UPLOAD = {
  MAX_SIZE_MB: 5,
  MAX_SIZE_BYTES: 5 * 1024 * 1024,
  ALLOWED_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
  UPLOAD_DIR: 'uploads',
} as const;

// Nutrition Thresholds (for health tips)
export const NUTRITION_THRESHOLDS = {
  HIGH_PROTEIN: 20,
  LOW_PROTEIN: 10,
  BALANCED_PROTEIN: 15,
  LOW_CALORIE: 300,
  HIGH_CALORIE: 600,
  BALANCED_CARBS: 20,
  BALANCED_FAT: 10,
  HIGH_SUGAR: 20,
  LOW_CARB: 30,
  LOW_FAT: 15,
  LOW_CALORIE_FILTER: 400,
} as const;

// Nutrition Filters (for search queries)
export const NUTRITION_FILTERS = {
  HIGH_PROTEIN_MIN: 20,
  LOW_CALORIE_MAX: 400,
  LOW_CARB_MAX: 30,
  LOW_FAT_MAX: 15,
} as const;

// USDA API Nutrient IDs
export const USDA_NUTRIENT_IDS = {
  ENERGY: 1008,
  PROTEIN: 1003,
  CARBS: 1005,
  FAT: 1004,
  FIBER: 1079,
  SUGAR: 2000,
} as const;

// Calorie Range for AI Suggestions
export const CALORIE_RANGE = {
  MIN: 100,
  MAX: 3000,
} as const;

// HTTP Status Codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_ERROR: 500,
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  SERVER_ERROR: 'Server error',
  UNAUTHORIZED: 'Unauthorized',
  NOT_FOUND: 'Not found',
  VALIDATION_ERROR: 'Validation error',
  USER_EXISTS: 'User already exists',
  INVALID_CREDENTIALS: 'Invalid credentials',
  IMAGE_REQUIRED: 'Image is required',
  SEARCH_QUERY_REQUIRED: 'Search query required',
  NUTRITION_FETCH_FAILED: 'Failed to fetch nutrition data',
  AI_ANALYSIS_FAILED: 'Failed to analyze meal',
} as const;
