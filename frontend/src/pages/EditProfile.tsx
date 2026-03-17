import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import userService from '../services/userService';
import { Button, Input } from '../components/common';
import { BASE_URL } from '../services/api';
import styles from './EditProfile.module.css';

const EditProfile: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const getProfileImageUrl = (profileImage?: string) => {
    if (!profileImage) return '/default-avatar.svg';
    if (profileImage.startsWith('http')) return profileImage;
    return `${BASE_URL}${profileImage.startsWith('/') ? '' : '/'}${profileImage}`;
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

    if (!displayName.trim()) {
      toast.error('Display name is required');
      return;
    }

    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append('displayName', displayName);
      if (selectedFile) {
        formData.append('profileImage', selectedFile);
      }

      await userService.updateProfile(formData);
      await refreshUser();
      toast.success('Profile updated');
      navigate('/profile');
    } catch {
      toast.error('Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>Edit Profile</h1>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.avatarSection}>
            <img
              src={imagePreview || getProfileImageUrl(user?.profileImage)}
              alt={user?.displayName}
              className={styles.avatar}
              onClick={() => fileInputRef.current?.click()}
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/default-avatar.svg';
              }}
            />
            <button
              type="button"
              className={styles.changePhotoBtn}
              onClick={() => fileInputRef.current?.click()}
            >
              Change Photo
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className={styles.fileInput}
            />
          </div>

          <Input
            label="Display Name"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your display name"
          />

          <Input
            label="Email"
            type="email"
            value={user?.email || ''}
            disabled
          />

          <div className={styles.actions}>
            <Button type="button" variant="outline" onClick={() => navigate('/profile')}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isLoading}>
              Save Changes
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditProfile;
