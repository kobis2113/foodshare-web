import React, { useState, useEffect, useCallback } from 'react';
import InfiniteScroll from 'react-infinite-scroll-component';
import toast from 'react-hot-toast';
import type { Post } from '../types';
import postService from '../services/postService';
import { PostCard } from '../components/posts';
import { Loader } from '../components/common';
import styles from './Home.module.css';

const Home: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPosts = useCallback(async (pageNum: number) => {
    try {
      const response = await postService.getPosts(pageNum, 10);
      if (pageNum === 1) {
        setPosts(response.posts);
      } else {
        setPosts(prev => [...prev, ...response.posts]);
      }
      setHasMore(response.pagination?.hasMore ?? false);
    } catch {
      toast.error('Failed to load posts');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts(1);
  }, [fetchPosts]);

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchPosts(nextPage);
  };

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

  if (isLoading) {
    return <Loader fullScreen />;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Food Feed</h1>
        <p className={styles.subtitle}>Discover delicious meals from the community</p>
      </div>

      {posts.length === 0 ? (
        <div className={styles.empty}>
          <p>No posts yet. Be the first to share a meal!</p>
        </div>
      ) : (
        <InfiniteScroll
          dataLength={posts.length}
          next={loadMore}
          hasMore={hasMore}
          loader={<Loader />}
          endMessage={
            <p className={styles.endMessage}>You've seen all posts</p>
          }
          className={styles.feed}
        >
          {posts.map(post => (
            <PostCard key={post._id} post={post} onLike={handleLike} />
          ))}
        </InfiniteScroll>
      )}
    </div>
  );
};

export default Home;
