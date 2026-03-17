import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import postService from '../services/postService';
import aiService from '../services/aiService';
import { Button, Input, Loader } from '../components/common';
import styles from './CreatePost.module.css';

const createPostSchema = z.object({
  title: z.string().min(1, 'Meal name is required').max(100, 'Meal name must be less than 100 characters'),
  description: z.string().max(500, 'Description must be less than 500 characters').optional(),
});

type CreatePostFormData = z.infer<typeof createPostSchema>;

interface NutritionData {
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
}

const CreatePost: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [nutritionTips, setNutritionTips] = useState<string[]>([]);
  const [nutritionData, setNutritionData] = useState<NutritionData | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<CreatePostFormData>({
    resolver: zodResolver(createPostSchema),
    defaultValues: { title: '', description: '' },
  });

  const titleValue = watch('title');

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        setImageError('Please select a valid image (JPEG, PNG, GIF, or WebP)');
        return;
      }
      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        setImageError('Image must be less than 5MB');
        return;
      }
      setImageError(null);
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGetTips = async () => {
    if (!titleValue.trim()) {
      toast.error('Enter a meal name first');
      return;
    }

    setIsAnalyzing(true);
    try {
      const response = await aiService.getNutritionInfo(titleValue);
      const tips = response.healthTips || (response.tips ? [response.tips] : []);
      setNutritionTips(tips);
      setNutritionData({
        calories: response.calories,
        protein: response.protein,
        carbs: response.carbs,
        fat: response.fat,
      });
    } catch {
      toast.error('Failed to get nutrition info');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const onSubmit = async (formData: CreatePostFormData) => {
    // Validate image
    if (!selectedFile) {
      setImageError('Please select an image');
      return;
    }

    setIsLoading(true);
    try {
      const data = new FormData();
      data.append('mealName', formData.title);
      data.append('description', formData.description || '');
      data.append('image', selectedFile);

      // Include nutrition data if available
      if (nutritionData) {
        data.append('nutrition', JSON.stringify(nutritionData));
      }

      await postService.createPost(data);
      toast.success('Post created!');
      navigate('/');
    } catch {
      toast.error('Failed to create post');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>Share a Meal</h1>

        <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
          <div className={styles.imageUpload} onClick={() => fileInputRef.current?.click()}>
            {imagePreview ? (
              <img src={imagePreview} alt="Preview" className={styles.preview} />
            ) : (
              <div className={styles.uploadPlaceholder}>
                <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
                <p>Click to upload image</p>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className={styles.fileInput}
            />
          </div>
          {imageError && <p className={styles.errorText}>{imageError}</p>}

          <div className={styles.inputWithButton}>
            <Input
              label="Meal Name"
              type="text"
              placeholder="What did you make?"
              error={errors.title?.message}
              {...register('title')}
            />
            <Button type="button" variant="outline" size="sm" onClick={handleGetTips} disabled={isAnalyzing}>
              {isAnalyzing ? <Loader /> : 'Get Tips'}
            </Button>
          </div>

          {(nutritionData || nutritionTips.length > 0) && (
            <div className={styles.tipsSection}>
              {nutritionData && (
                <>
                  <h4>Nutrition Info</h4>
                  <div className={styles.nutritionGrid}>
                    {nutritionData.calories && <div className={styles.nutritionItem}><span>Calories</span><strong>{nutritionData.calories}</strong></div>}
                    {nutritionData.protein && <div className={styles.nutritionItem}><span>Protein</span><strong>{nutritionData.protein}g</strong></div>}
                    {nutritionData.carbs && <div className={styles.nutritionItem}><span>Carbs</span><strong>{nutritionData.carbs}g</strong></div>}
                    {nutritionData.fat && <div className={styles.nutritionItem}><span>Fat</span><strong>{nutritionData.fat}g</strong></div>}
                  </div>
                </>
              )}
              {nutritionTips.length > 0 && (
                <>
                  <h4 style={{ marginTop: nutritionData ? '12px' : 0 }}>Health Tips</h4>
                  <ul>
                    {nutritionTips.map((tip, index) => (
                      <li key={index}>{tip}</li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          )}

          <div className={styles.textareaWrapper}>
            <label className={styles.label}>Description</label>
            <textarea
              placeholder="Tell us about this dish..."
              className={`${styles.textarea} ${errors.description ? styles.textareaError : ''}`}
              rows={4}
              {...register('description')}
            />
            {errors.description && <p className={styles.errorText}>{errors.description.message}</p>}
          </div>

          <Button type="submit" fullWidth isLoading={isLoading}>
            Share Post
          </Button>
        </form>
      </div>
    </div>
  );
};

export default CreatePost;
