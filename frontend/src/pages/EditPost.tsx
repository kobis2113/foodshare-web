import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import type { Post } from '../types';
import postService from '../services/postService';
import aiService from '../services/aiService';
import { Button, Input, Loader } from '../components/common';
import { getImageUrl } from '../utils/imageUtils';
import { VALIDATION, IMAGE_UPLOAD } from '../constants';
import styles from './CreatePost.module.css';

const editPostSchema = z.object({
  title: z.string()
    .min(VALIDATION.MEAL_NAME.MIN_LENGTH, 'Meal name is required')
    .max(VALIDATION.MEAL_NAME.MAX_LENGTH, `Meal name must be less than ${VALIDATION.MEAL_NAME.MAX_LENGTH} characters`),
  description: z.string()
    .max(VALIDATION.DESCRIPTION.MAX_LENGTH, `Description must be less than ${VALIDATION.DESCRIPTION.MAX_LENGTH} characters`)
    .optional(),
});

type EditPostFormData = z.infer<typeof editPostSchema>;

interface NutritionData {
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
}

interface AnalysisResult {
  isFood: boolean;
  foodDetected?: string;
  confidence?: 'low' | 'medium' | 'high';
  source?: 'gemini' | 'fallback';
  nutritionError?: boolean;
  nutritionErrorMessage?: string;
}

const EditPost: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [originalPost, setOriginalPost] = useState<Post | null>(null);
  const [nutritionTips, setNutritionTips] = useState<string[]>([]);
  const [nutritionData, setNutritionData] = useState<NutritionData | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<EditPostFormData>({
    resolver: zodResolver(editPostSchema),
    defaultValues: { title: '', description: '' },
  });

  const titleValue = watch('title');

  useEffect(() => {
    const fetchPost = async () => {
      if (!id) return;
      try {
        const post = await postService.getPost(id);
        setOriginalPost(post);
        reset({ title: post.mealName, description: post.description || '' });
        setImagePreview(getImageUrl(post.image));
        // Load existing nutrition data
        if (post.nutrition) {
          setNutritionData({
            calories: post.nutrition.calories,
            protein: post.nutrition.protein,
            carbs: post.nutrition.carbs,
            fat: post.nutrition.fat,
          });
          if (post.nutrition.healthTips) {
            setNutritionTips(post.nutrition.healthTips);
          }
        }
      } catch {
        toast.error('Failed to load post');
        navigate('/my-posts');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPost();
  }, [id, navigate, reset]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!IMAGE_UPLOAD.ALLOWED_TYPES.includes(file.type)) {
        setImageError('Please select a valid image (JPEG, PNG, GIF, or WebP)');
        return;
      }
      // Validate file size
      if (file.size > IMAGE_UPLOAD.MAX_SIZE_BYTES) {
        setImageError(`Image must be less than ${IMAGE_UPLOAD.MAX_SIZE_MB}MB`);
        return;
      }
      setImageError(null);
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        setImagePreview(dataUrl);
        setImageBase64(dataUrl.split(',')[1]);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyze = async () => {
    if (!titleValue.trim()) {
      toast.error('Enter a meal name first');
      return;
    }

    // Need either a new image or convert existing image
    if (!imageBase64 && !selectedFile) {
      // If no new image, need to fetch existing image and convert to base64
      if (imagePreview && !imagePreview.startsWith('data:')) {
        toast.error('Please select a new image to re-analyze');
        return;
      }
    }

    if (!imagePreview) {
      toast.error('Please select an image first');
      return;
    }

    setIsAnalyzing(true);
    setAnalysisResult(null);

    try {
      // Get base64 data
      let base64Data = imageBase64;
      let mimeType = selectedFile?.type || 'image/jpeg';

      // If no new image was selected, we can't do AI vision analysis
      if (!base64Data) {
        toast.error('Please select a new image to analyze with AI');
        setIsAnalyzing(false);
        return;
      }

      const descriptionValue = watch('description');

      // Call AI Vision analysis
      const response = await aiService.analyzeMeal(
        titleValue,
        base64Data,
        descriptionValue || undefined,
        mimeType
      );

      // Check if it's actually food
      if (!response.isFood) {
        setImageError('This image does not appear to contain food. Please upload a food image.');
        setAnalysisResult({ isFood: false, source: response.source });
        toast.error('Image does not contain food');
        return;
      }

      // Set nutrition data
      setNutritionData({
        calories: response.calories,
        protein: response.protein,
        carbs: response.carbs,
        fat: response.fat,
      });

      // Set tips
      setNutritionTips(response.healthTips || []);

      // Set analysis result
      setAnalysisResult({
        isFood: true,
        foodDetected: response.foodDetected,
        confidence: response.confidence,
        source: response.source,
        nutritionError: response.nutritionError,
        nutritionErrorMessage: response.nutritionErrorMessage,
      });

      setImageError(null);

      if (response.nutritionError) {
        toast.error(response.nutritionErrorMessage || 'Could not fetch nutrition data');
      } else if (response.source === 'gemini') {
        toast.success('AI analysis complete!');
      } else {
        toast('Using USDA nutrition data (AI unavailable)', { icon: '📊' });
      }
    } catch {
      toast.error('Failed to analyze meal');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const onSubmit = async (formData: EditPostFormData) => {
    if (!id) return;

    setIsSaving(true);
    try {
      const data = new FormData();
      data.append('mealName', formData.title);
      data.append('description', formData.description || '');
      if (selectedFile) {
        data.append('image', selectedFile);
      }

      // Include nutrition data if available
      if (nutritionData) {
        data.append('nutrition', JSON.stringify({
          ...nutritionData,
          healthTips: nutritionTips
        }));
      }

      await postService.updatePost(id, data);
      toast.success('Post updated');
      navigate(`/post/${id}`);
    } catch {
      toast.error('Failed to update post');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!id || !confirm('Are you sure you want to delete this post?')) return;

    try {
      await postService.deletePost(id);
      toast.success('Post deleted');
      navigate('/my-posts');
    } catch {
      toast.error('Failed to delete post');
    }
  };

  if (isLoading) {
    return <Loader fullScreen />;
  }

  if (!originalPost) {
    return <div className={styles.notFound}>Post not found</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>Edit Post</h1>

        <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
          <div className={styles.imageUpload} onClick={() => fileInputRef.current?.click()}>
            {imagePreview ? (
              <img src={imagePreview} alt="Preview" className={styles.preview} />
            ) : (
              <div className={styles.uploadPlaceholder}>
                <p>Click to change image</p>
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
            <Button type="button" variant="outline" size="sm" onClick={handleAnalyze} disabled={isAnalyzing}>
              {isAnalyzing ? <Loader /> : '✨ Analyze'}
            </Button>
          </div>

          {(nutritionData || nutritionTips.length > 0 || analysisResult) && (
            <div className={styles.tipsSection}>
              {analysisResult && analysisResult.isFood && (
                <div className={styles.aiAnalysis}>
                  <span className={styles.aiSource}>
                    {analysisResult.source === 'gemini' ? '🤖 AI Analysis' : '📊 Estimated'}
                  </span>
                  {analysisResult.foodDetected && (
                    <span className={styles.foodDetected}>Detected: {analysisResult.foodDetected}</span>
                  )}
                  {analysisResult.confidence && (
                    <span className={styles.confidence}>
                      Confidence: {analysisResult.confidence}
                    </span>
                  )}
                </div>
              )}
              {analysisResult?.nutritionError ? (
                <div className={styles.nutritionError}>
                  <h4>Nutrition Info</h4>
                  <p>{analysisResult.nutritionErrorMessage || 'Could not fetch nutrition data'}</p>
                </div>
              ) : nutritionData && (nutritionData.calories !== undefined || nutritionData.protein !== undefined || nutritionData.carbs !== undefined || nutritionData.fat !== undefined) && (
                <>
                  <h4>Nutrition Info</h4>
                  <div className={styles.nutritionGrid}>
                    {nutritionData.calories !== undefined && <div className={styles.nutritionItem}><span>Calories</span><strong>{nutritionData.calories}</strong></div>}
                    {nutritionData.protein !== undefined && <div className={styles.nutritionItem}><span>Protein</span><strong>{nutritionData.protein}g</strong></div>}
                    {nutritionData.carbs !== undefined && <div className={styles.nutritionItem}><span>Carbs</span><strong>{nutritionData.carbs}g</strong></div>}
                    {nutritionData.fat !== undefined && <div className={styles.nutritionItem}><span>Fat</span><strong>{nutritionData.fat}g</strong></div>}
                  </div>
                </>
              )}
              {nutritionTips.length > 0 && (
                <>
                  <h4 className={nutritionData ? styles.tipsHeader : undefined}>Health Tips</h4>
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

          <div className={styles.buttonGroup}>
            <Button type="button" variant="danger" onClick={handleDelete}>
              Delete Post
            </Button>
            <Button type="submit" fullWidth isLoading={isSaving}>
              Save Changes
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditPost;
