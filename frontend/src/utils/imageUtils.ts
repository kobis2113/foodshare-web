import { BASE_URL } from '../services/api';

export const getImageUrl = (image?: string): string => {
  if (!image) return '/default-food.svg';
  if (image.startsWith('http')) return image;
  return `${BASE_URL}${image.startsWith('/') ? '' : '/'}${image}`;
};

export const getProfileImageUrl = (profileImage?: string): string => {
  if (!profileImage) return '/default-avatar.svg';
  if (profileImage.startsWith('http')) return profileImage;
  return `${BASE_URL}${profileImage.startsWith('/') ? '' : '/'}${profileImage}`;
};

export const handleImageError = (
  e: React.SyntheticEvent<HTMLImageElement>,
  fallback: string = '/default-food.svg'
): void => {
  (e.target as HTMLImageElement).src = fallback;
};
