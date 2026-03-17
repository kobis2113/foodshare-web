import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import type { Post } from '../types';
import postService from '../services/postService';
import { PostCard } from '../components/posts';
import { Loader, Button } from '../components/common';
import styles from './MyPosts.module.css';

const MyPosts: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchMyPosts = async () => {
      try {
        const response = await postService.getMyPosts();
        setPosts(response.posts);
      } catch {
        toast.error('Failed to load your posts');
      } finally {
        setIsLoading(false);
      }
    };

    fetchMyPosts();
  }, []);

  const handleLike = async (postId: string) => {
    try {
      const response = await postService.toggleLike(postId);
      setPosts(prev =>
        prev.map(post =>
          post._id === postId
            ? { ...post, isLiked: response.isLiked, likesCount: response.likesCount }
            : post
        )
      );
    } catch {
      toast.error('Failed to like post');
    }
  };

  const handleDelete = async (postId: string) => {
    if (!confirm('Are you sure you want to delete this post?')) return;

    try {
      await postService.deletePost(postId);
      setPosts(prev => prev.filter(post => post._id !== postId));
      toast.success('Post deleted');
    } catch {
      toast.error('Failed to delete post');
    }
  };

  if (isLoading) {
    return <Loader fullScreen />;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>My Posts</h1>
        <Link to="/create">
          <Button>Create Post</Button>
        </Link>
      </div>

      {posts.length === 0 ? (
        <div className={styles.empty}>
          <p>You haven't shared any meals yet.</p>
          <Link to="/create">
            <Button>Share Your First Meal</Button>
          </Link>
        </div>
      ) : (
        <div className={styles.grid}>
          {posts.map(post => (
            <div key={post._id} className={styles.postWrapper}>
              <PostCard post={post} onLike={handleLike} />
              <div className={styles.actions}>
                <Link to={`/edit/${post._id}`}>
                  <Button variant="outline" size="sm">Edit</Button>
                </Link>
                <Button variant="danger" size="sm" onClick={() => handleDelete(post._id)}>
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyPosts;
