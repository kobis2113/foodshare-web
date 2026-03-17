// User types
export interface User {
  _id: string;
  id?: string;
  email: string;
  displayName: string;
  profileImage?: string;
  authProvider?: string;
  createdAt?: string;
}

// Auth types
export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  displayName: string;
}

// Post types
export interface Author {
  _id: string;
  displayName: string;
  profileImage?: string;
}

export interface Nutrition {
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
  sugar?: number;
  healthTips?: string[];
}

export interface Post {
  _id: string;
  author: Author;
  mealName: string;
  description?: string;
  image: string;
  nutrition?: Nutrition;
  likesCount: number;
  commentsCount: number;
  isLiked: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface PostsResponse {
  posts: Post[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasMore: boolean;
  };
}

// Comment types
export interface Comment {
  _id: string;
  author: Author;
  post: string;
  text: string;
  createdAt: string;
}

// API Response types
export interface ApiError {
  message: string;
  status?: number;
}

// Like response
export interface LikeResponse {
  isLiked: boolean;
  likesCount: number;
}

// Nutrition API response
export interface NutritionResponse {
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
  sugar?: number;
  tips?: string;
  healthTips?: string[];
}

// AI types
export interface AIAnalysisResponse {
  analysis: string;
  nutritionEstimate?: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  healthTips?: string[];
}

export interface AISuggestionResponse {
  suggestions: string[];
}
