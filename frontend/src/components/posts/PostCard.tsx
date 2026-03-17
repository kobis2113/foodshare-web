import React from 'react';
import { Link } from 'react-router-dom';
import type { Post } from '../../types';
import { BASE_URL } from '../../services/api';
import styles from './PostCard.module.css';

interface PostCardProps {
  post: Post;
  onLike: (postId: string) => void;
}

const PostCard: React.FC<PostCardProps> = ({ post, onLike }) => {
  const getImageUrl = (image?: string) => {
    if (!image) return '/default-food.svg';
    if (image.startsWith('http')) return image;
    return `${BASE_URL}${image.startsWith('/') ? '' : '/'}${image}`;
  };

  const getProfileImageUrl = (profileImage?: string) => {
    if (!profileImage) return '/default-avatar.svg';
    if (profileImage.startsWith('http')) return profileImage;
    return `${BASE_URL}${profileImage.startsWith('/') ? '' : '/'}${profileImage}`;
  };

  return (
    <article className={styles.card}>
      <div className={styles.header}>
        <img
          src={getProfileImageUrl(post.author?.profileImage)}
          alt={post.author?.displayName || 'User'}
          className={styles.avatar}
          referrerPolicy="no-referrer"
          onError={(e) => {
            (e.target as HTMLImageElement).src = '/default-avatar.svg';
          }}
        />
        <div className={styles.authorInfo}>
          <span className={styles.authorName}>{post.author?.displayName}</span>
          <span className={styles.date}>
            {new Date(post.createdAt).toLocaleDateString()}
          </span>
        </div>
      </div>

      <Link to={`/post/${post._id}`} className={styles.imageLink}>
        <img
          src={getImageUrl(post.image)}
          alt={post.mealName}
          className={styles.image}
          onError={(e) => {
            (e.target as HTMLImageElement).src = '/default-food.svg';
          }}
        />
      </Link>

      <div className={styles.content}>
        <Link to={`/post/${post._id}`} className={styles.titleLink}>
          <h3 className={styles.title}>{post.mealName}</h3>
        </Link>
        {post.description && (
          <p className={styles.description}>{post.description}</p>
        )}
      </div>

      <div className={styles.actions}>
        <button
          className={`${styles.likeBtn} ${post.isLiked ? styles.liked : ''}`}
          onClick={() => onLike(post._id)}
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill={post.isLiked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
          <span>{post.likesCount || 0}</span>
        </button>
        <Link to={`/post/${post._id}`} className={styles.commentBtn}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <span>{post.commentsCount || 0}</span>
        </Link>
      </div>
    </article>
  );
};

export default PostCard;
