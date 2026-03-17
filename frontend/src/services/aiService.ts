import api from './api';
import type { NutritionResponse, AIAnalysisResponse, AISuggestionResponse } from '../types';

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

  getHealthTips: async (mealName: string): Promise<{ tips: string[] }> => {
    const response = await api.get<{ tips: string[] }>(`/api/ai/tips?meal=${encodeURIComponent(mealName)}`);
    return response.data;
  },
};

export default aiService;
