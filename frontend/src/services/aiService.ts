import api from './api';
import type { NutritionResponse, AIAnalysisResponse, AISuggestionResponse, Post } from '../types';

export interface SmartSearchResponse {
  posts: Post[];
  searchCriteria: {
    keywords: string[];
    nutritionFilters?: {
      highProtein?: boolean;
      lowCalorie?: boolean;
      lowCarb?: boolean;
      lowFat?: boolean;
    };
    mealType?: string;
    healthFocus?: string;
    searchExplanation?: string;
    fallback?: boolean;
  };
  aiInsights: string | null;
  totalResults: number;
  source: 'gemini' | 'fallback';
}

export interface MealAnalysisResponse {
  isFood: boolean;
  foodDetected: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  confidence: 'low' | 'medium' | 'high';
  healthTips: string[];
  source: 'gemini' | 'fallback';
  mealName: string;
  fallbackReason?: string;
  nutritionError?: boolean;
  nutritionErrorMessage?: string;
}

export const aiService = {
  getNutritionInfo: async (query: string): Promise<NutritionResponse> => {
    const response = await api.get<NutritionResponse>(`/api/nutrition?query=${encodeURIComponent(query)}`);
    return response.data;
  },

  analyzeImage: async (imageFile: File): Promise<AIAnalysisResponse> => {
    const formData = new FormData();
    formData.append('image', imageFile);
    const response = await api.post<AIAnalysisResponse>('/api/ai/analyze', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  getSuggestions: async (mealName: string): Promise<AISuggestionResponse> => {
    const response = await api.get<AISuggestionResponse>(`/api/ai/suggestions?meal=${encodeURIComponent(mealName)}`);
    return response.data;
  },

  getAITips: async (mealName: string, nutrition?: { calories?: number; protein?: number; carbs?: number; fat?: number }): Promise<{ tips: string[]; source: string }> => {
    const response = await api.post<{ tips: string[]; source: string }>('/api/ai/tips', { mealName, nutrition });
    return response.data;
  },

  // AI-powered natural language smart search
  smartSearch: async (query: string): Promise<SmartSearchResponse> => {
    const response = await api.get<SmartSearchResponse>(`/api/ai/smart-search?q=${encodeURIComponent(query)}`);
    return response.data;
  },

  // AI Vision - analyze meal image with nutrition estimation
  analyzeMeal: async (
    mealName: string,
    imageBase64: string,
    description?: string,
    mimeType?: string
  ): Promise<MealAnalysisResponse> => {
    const response = await api.post<MealAnalysisResponse>('/api/ai/analyze-meal', {
      mealName,
      imageBase64,
      description,
      mimeType: mimeType || 'image/jpeg'
    });
    return response.data;
  },
};

export default aiService;
