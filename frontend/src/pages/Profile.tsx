import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import type { Post } from '../types';
import postService from '../services/postService';
import { Button, Loader } from '../components/common';
import { BASE_URL } from '../services/api';
import styles from './Profile.module.css';

const Profile: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [myPosts, setMyPosts] = useState<Post[]>([]);
  const [likedPosts, setLikedPosts] = useState<Post[]>([]);
  const [activeTab, setActiveTab] = useState<'posts' | 'liked'>('posts');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [postsRes, likedRes] = await Promise.all([
          postService.getMyPosts(),
          postService.getLikedPosts(),
        ]);
        setMyPosts(postsRes.posts);
        setLikedPosts(likedRes.posts);
      } catch {
        toast.error('Failed to load profile data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const getProfileImageUrl = (profileImage?: string) => {
    if (!profileImage) return '/default-avatar.svg';
    if (profileImage.startsWith('http')) return profileImage;
    return `${BASE_URL}${profileImage.startsWith('/') ? '' : '/'}${profileImage}`;
  };

  const getImageUrl = (image?: string) => {
    if (!image) return '/default-food.svg';
    if (image.startsWith('http')) return image;
    return `${BASE_URL}${image.startsWith('/') ? '' : '/'}${image}`;
  };

  if (isLoading) {
    return <Loader fullScreen />;
  }

  const displayPosts = activeTab === 'posts' ? myPosts : likedPosts;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <img
          src={getProfileImageUrl(user?.profileImage)}
          alt={user?.displayName}
          className={styles.avatar}
          referrerPolicy="no-referrer"
          onError={(e) => {
            (e.target as HTMLImageElement).src = '/default-avatar.svg';
          }}
        />
        <h1 className={styles.name}>{user?.displayName}</h1>
        <p className={styles.email}>{user?.email}</p>

        <div className={styles.stats}>
          <div className={styles.stat}>
            <span className={styles.statValue}>{myPosts.length}</span>
            <span className={styles.statLabel}>Posts</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statValue}>{likedPosts.length}</span>
            <span className={styles.statLabel}>Liked</span>
          </div>
        </div>

        <div className={styles.actions}>
          <Link to="/edit-profile">
            <Button variant="outline">Edit Profile</Button>
          </Link>
          <Button variant="danger" onClick={handleLogout}>Logout</Button>
        </div>
      </div>

      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'posts' ? styles.active : ''}`}
          onClick={() => setActiveTab('posts')}
        >
          My Posts
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'liked' ? styles.active : ''}`}
          onClick={() => setActiveTab('liked')}
        >
          Liked
        </button>
      </div>

      {displayPosts.length === 0 ? (
        <div className={styles.empty}>
          <p>{activeTab === 'posts' ? 'No posts yet' : 'No liked posts'}</p>
        </div>
      ) : (
        <div className={styles.grid}>
          {displayPosts.map(post => (
            <Link key={post._id} to={`/post/${post._id}`} className={styles.gridItem}>
              <img
                src={getImageUrl(post.image)}
                alt={post.mealName}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/default-food.svg';
                }}
              />
              <div className={styles.overlay}>
                <span>{post.likesCount} likes</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default Profile;
