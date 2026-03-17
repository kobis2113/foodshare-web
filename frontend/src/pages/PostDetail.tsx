import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import type { Post, Comment } from '../types';
import { useAuth } from '../context/AuthContext';
import postService from '../services/postService';
import { Button, Input, Loader } from '../components/common';
import { BASE_URL } from '../services/api';
import styles from './PostDetail.module.css';

const PostDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      try {
        const [postData, commentsData] = await Promise.all([
          postService.getPost(id),
          postService.getComments(id),
        ]);
        setPost(postData);
        setComments(commentsData.comments);
      } catch {
        toast.error('Failed to load post');
        navigate('/');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [id, navigate]);

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

  const handleLike = async () => {
    if (!post || !id) return;
    try {
      const response = await postService.toggleLike(id);
      setPost({ ...post, isLiked: response.isLiked, likesCount: response.likesCount });
    } catch {
      toast.error('Failed to like post');
    }
  };

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !id) return;

    setIsSubmitting(true);
    try {
      const response = await postService.addComment(id, newComment);
      setComments([...comments, response.comment]);
      setNewComment('');
      if (post) {
        setPost({ ...post, commentsCount: post.commentsCount + 1 });
      }
    } catch {
      toast.error('Failed to add comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!id || !confirm('Are you sure you want to delete this post?')) return;

    try {
      await postService.deletePost(id);
      toast.success('Post deleted');
      navigate('/');
    } catch {
      toast.error('Failed to delete post');
    }
  };

  if (isLoading) {
    return <Loader fullScreen />;
  }

  if (!post) {
    return <div className={styles.error}>Post not found</div>;
  }

  const isAuthor = user?._id === post.author._id;

  return (
    <div className={styles.container}>
      <div className={styles.post}>
        <div className={styles.header}>
          <img
            src={getProfileImageUrl(post.author.profileImage)}
            alt={post.author.displayName}
            className={styles.avatar}
          />
          <div className={styles.authorInfo}>
            <span className={styles.authorName}>{post.author.displayName}</span>
            <span className={styles.date}>{new Date(post.createdAt).toLocaleDateString()}</span>
          </div>
          {isAuthor && (
            <div className={styles.postActions}>
              <Link to={`/edit/${post._id}`}>
                <Button variant="outline" size="sm">Edit</Button>
              </Link>
              <Button variant="danger" size="sm" onClick={handleDelete}>Delete</Button>
            </div>
          )}
        </div>

        <img src={getImageUrl(post.image)} alt={post.mealName} className={styles.image} />

        <div className={styles.content}>
          <div className={styles.actions}>
            <button className={`${styles.likeBtn} ${post.isLiked ? styles.liked : ''}`} onClick={handleLike}>
              <svg viewBox="0 0 24 24" width="24" height="24" fill={post.isLiked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
              <span>{post.likesCount}</span>
            </button>
            <span className={styles.commentCount}>{post.commentsCount} comments</span>
          </div>

          <h1 className={styles.title}>{post.mealName}</h1>
          {post.description && <p className={styles.description}>{post.description}</p>}

          {post.nutrition && (
            <div className={styles.nutrition}>
              <h3>Nutrition Info</h3>
              <div className={styles.nutritionGrid}>
                {post.nutrition.calories && <div className={styles.nutritionItem}><span>Calories</span><strong>{post.nutrition.calories}</strong></div>}
                {post.nutrition.protein && <div className={styles.nutritionItem}><span>Protein</span><strong>{post.nutrition.protein}g</strong></div>}
                {post.nutrition.carbs && <div className={styles.nutritionItem}><span>Carbs</span><strong>{post.nutrition.carbs}g</strong></div>}
                {post.nutrition.fat && <div className={styles.nutritionItem}><span>Fat</span><strong>{post.nutrition.fat}g</strong></div>}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className={styles.commentsSection}>
        <h2 className={styles.commentsTitle}>Comments</h2>

        <form onSubmit={handleComment} className={styles.commentForm}>
          <Input
            placeholder="Add a comment..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
          />
          <Button type="submit" isLoading={isSubmitting} disabled={!newComment.trim()}>
            Post
          </Button>
        </form>

        <div className={styles.commentsList}>
          {comments.length === 0 ? (
            <p className={styles.noComments}>No comments yet</p>
          ) : (
            comments.map(comment => (
              <div key={comment._id} className={styles.comment}>
                <img
                  src={getProfileImageUrl(comment.author.profileImage)}
                  alt={comment.author.displayName}
                  className={styles.commentAvatar}
                />
                <div className={styles.commentContent}>
                  <span className={styles.commentAuthor}>{comment.author.displayName}</span>
                  <p className={styles.commentText}>{comment.text}</p>
                  <span className={styles.commentDate}>{new Date(comment.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default PostDetail;
