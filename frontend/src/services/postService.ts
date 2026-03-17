import api from './api';
import type { Post, PostsResponse, Comment, LikeResponse } from '../types';

export const postService = {
  // Get all posts with pagination
  getPosts: async (page: number = 1, limit: number = 10): Promise<PostsResponse> => {
    const response = await api.get<PostsResponse>(`/api/posts?page=${page}&limit=${limit}`);
    return response.data;
  },

  // Search posts
  searchPosts: async (query: string, page: number = 1): Promise<PostsResponse> => {
    const response = await api.get<PostsResponse>(`/api/posts/search?q=${encodeURIComponent(query)}&page=${page}`);
    return response.data;
  },

  // Get single post
  getPost: async (postId: string): Promise<Post> => {
    const response = await api.get<Post>(`/api/posts/${postId}`);
    return response.data;
  },

  // Create post
  createPost: async (formData: FormData): Promise<{ message: string; post: Post }> => {
    const response = await api.post<{ message: string; post: Post }>('/api/posts', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Update post
  updatePost: async (postId: string, formData: FormData): Promise<{ message: string; post: Post }> => {
    const response = await api.put<{ message: string; post: Post }>(`/api/posts/${postId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Delete post
  deletePost: async (postId: string): Promise<{ message: string }> => {
    const response = await api.delete<{ message: string }>(`/api/posts/${postId}`);
    return response.data;
  },

  // Toggle like
  toggleLike: async (postId: string): Promise<LikeResponse> => {
    const response = await api.post<LikeResponse>(`/api/posts/${postId}/like`);
    return response.data;
  },

  // Get comments
  getComments: async (postId: string): Promise<{ comments: Comment[] }> => {
    const response = await api.get<{ comments: Comment[] }>(`/api/posts/${postId}/comments`);
    return response.data;
  },

  // Add comment
  addComment: async (postId: string, text: string): Promise<{ message: string; comment: Comment }> => {
    const response = await api.post<{ message: string; comment: Comment }>(`/api/posts/${postId}/comments`, { text });
    return response.data;
  },

  // Get my posts
  getMyPosts: async (): Promise<{ posts: Post[] }> => {
    const response = await api.get<{ posts: Post[] }>('/api/users/me/posts');
    return response.data;
  },

  // Get liked posts
  getLikedPosts: async (): Promise<{ posts: Post[] }> => {
    const response = await api.get<{ posts: Post[] }>('/api/users/me/liked');
    return response.data;
  },
};

export default postService;
