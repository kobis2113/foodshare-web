import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import postService from '../services/postService';
import aiService from '../services/aiService';
import { Button, Input, Loader } from '../components/common';
import styles from './CreatePost.module.css';

const CreatePost: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [formData, setFormData] = useState({ title: '', description: '' });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [nutritionTips, setNutritionTips] = useState<string[]>([]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGetTips = async () => {
    if (!formData.title.trim()) {
      toast.error('Enter a meal name first');
      return;
    }

    setIsAnalyzing(true);
    try {
      const response = await aiService.getNutritionInfo(formData.title);
      const tips = response.healthTips || (response.tips ? [response.tips] : []);
      setNutritionTips(tips);
      if (tips.length === 0) {
        toast('No tips available for this meal');
      }
    } catch {
      toast.error('Failed to get nutrition tips');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedFile) {
      toast.error('Please select an image');
      return;
    }

    if (!formData.title.trim()) {
      toast.error('Please enter a title');
      return;
    }

    setIsLoading(true);
    try {
      const data = new FormData();
      data.append('title', formData.title);
      data.append('description', formData.description);
      data.append('image', selectedFile);

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

        <form onSubmit={handleSubmit} className={styles.form}>
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

          <div className={styles.inputWithButton}>
            <Input
              label="Meal Name"
              type="text"
              placeholder="What did you make?"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
            <Button type="button" variant="outline" size="sm" onClick={handleGetTips} disabled={isAnalyzing}>
              {isAnalyzing ? <Loader /> : 'Get Tips'}
            </Button>
          </div>

          {nutritionTips.length > 0 && (
            <div className={styles.tipsSection}>
              <h4>Nutrition Tips</h4>
              <ul>
                {nutritionTips.map((tip, index) => (
                  <li key={index}>{tip}</li>
                ))}
              </ul>
            </div>
          )}

          <div className={styles.textareaWrapper}>
            <label className={styles.label}>Description</label>
            <textarea
              placeholder="Tell us about this dish..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className={styles.textarea}
              rows={4}
            />
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
