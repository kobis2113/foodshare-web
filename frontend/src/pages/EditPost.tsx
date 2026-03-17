import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import type { Post } from '../types';
import postService from '../services/postService';
import { Button, Input, Loader } from '../components/common';
import { BASE_URL } from '../services/api';
import styles from './CreatePost.module.css';

const EditPost: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [formData, setFormData] = useState({ title: '', description: '' });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [originalPost, setOriginalPost] = useState<Post | null>(null);

  useEffect(() => {
    const fetchPost = async () => {
      if (!id) return;
      try {
        const post = await postService.getPost(id);
        setOriginalPost(post);
        setFormData({ title: post.mealName, description: post.description || '' });
        setImagePreview(getImageUrl(post.image));
      } catch {
        toast.error('Failed to load post');
        navigate('/my-posts');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPost();
  }, [id, navigate]);

  const getImageUrl = (image?: string) => {
    if (!image) return '/default-food.svg';
    if (image.startsWith('http')) return image;
    return `${BASE_URL}${image.startsWith('/') ? '' : '/'}${image}`;
  };

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !formData.title.trim()) {
      toast.error('Please enter a title');
      return;
    }

    setIsSaving(true);
    try {
      const data = new FormData();
      data.append('title', formData.title);
      data.append('description', formData.description);
      if (selectedFile) {
        data.append('image', selectedFile);
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
    return <div style={{ padding: '40px', textAlign: 'center' }}>Post not found</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>Edit Post</h1>

        <form onSubmit={handleSubmit} className={styles.form}>
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

          <Input
            label="Meal Name"
            type="text"
            placeholder="What did you make?"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          />

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

          <div style={{ display: 'flex', gap: '12px' }}>
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
