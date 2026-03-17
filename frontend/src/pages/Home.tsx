import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import InfiniteScroll from 'react-infinite-scroll-component';
import toast from 'react-hot-toast';
import type { Post } from '../types';
import postService from '../services/postService';
import aiService, { type SmartSearchResponse } from '../services/aiService';
import { PostCard } from '../components/posts';
import { Loader, Input, Button } from '../components/common';
import { POSTS_PER_PAGE } from '../constants';
import styles from './Home.module.css';

const Home: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [useAISearch, setUseAISearch] = useState(false);
  const [aiInsights, setAiInsights] = useState<string | null>(null);
  const [searchExplanation, setSearchExplanation] = useState<string | null>(null);
  const [aiQuotaWarning, setAiQuotaWarning] = useState<string | null>(null);

  const fetchPosts = useCallback(async (pageNum: number, query?: string) => {
    try {
      const response = query
        ? await postService.searchPosts(query, pageNum)
        : await postService.getPosts(pageNum, POSTS_PER_PAGE);
      if (pageNum === 1) {
        setPosts(response.posts);
      } else {
        setPosts(prev => [...prev, ...response.posts]);
      }
      setHasMore(response.pagination?.hasMore ?? false);
      setAiInsights(null);
      setSearchExplanation(null);
    } catch {
      toast.error('Failed to load posts');
    } finally {
      setIsLoading(false);
      setIsSearching(false);
    }
  }, []);

  const fetchAISearch = async (query: string) => {
    try {
      const response: SmartSearchResponse = await aiService.smartSearch(query);
      setPosts(response.posts);
      setHasMore(false); // AI search doesn't paginate
      setAiInsights(response.aiInsights);
      setSearchExplanation(response.searchCriteria.searchExplanation || null);

      // Check if AI fell back to regular search due to quota
      if (response.source === 'fallback' || response.searchCriteria.fallback) {
        setAiQuotaWarning('AI quota exceeded. Using basic search. Please wait ~1 minute and try again.');
      } else {
        setAiQuotaWarning(null);
      }
    } catch (error: unknown) {
      const axiosError = error as { response?: { status?: number } };
      if (axiosError.response?.status === 429) {
        toast.error('AI search rate limit reached. Try regular search.');
        setAiQuotaWarning('Rate limit reached. Please wait a moment before trying AI search again.');
        setUseAISearch(false);
      } else {
        toast.error('AI search failed, using regular search');
        setAiQuotaWarning('AI service temporarily unavailable. Using basic search.');
      }
      // Fallback to regular search
      await fetchPosts(1, query);
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    fetchPosts(1);
  }, [fetchPosts]);

  const loadMore = () => {
    if (useAISearch) return; // AI search doesn't paginate
    const nextPage = page + 1;
    setPage(nextPage);
    fetchPosts(nextPage, searchQuery || undefined);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      clearSearch();
      return;
    }

    setIsSearching(true);
    setPage(1);

    if (useAISearch) {
      await fetchAISearch(searchQuery);
    } else {
      await fetchPosts(1, searchQuery);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setPage(1);
    setAiInsights(null);
    setSearchExplanation(null);
    setAiQuotaWarning(null);
    setIsLoading(true);
    fetchPosts(1);
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

      <form onSubmit={handleSearch} className={styles.searchForm}>
        <Input
          placeholder={useAISearch ? "Try: 'healthy breakfast with protein'" : "Search meals..."}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <Button type="submit" disabled={isSearching}>
          {isSearching ? <Loader /> : 'Search'}
        </Button>
        {searchQuery && (
          <Button type="button" variant="ghost" onClick={clearSearch}>
            Clear
          </Button>
        )}
      </form>

      <div className={styles.aiToggle}>
        <label className={styles.toggleLabel}>
          <input
            type="checkbox"
            checked={useAISearch}
            onChange={(e) => setUseAISearch(e.target.checked)}
            className={styles.toggleInput}
          />
          <span className={styles.toggleSlider}></span>
          <span className={styles.toggleText}>
            AI Smart Search
            <span className={styles.aiIcon}>✨</span>
          </span>
        </label>
        {useAISearch && (
          <p className={styles.aiHint}>
            Search naturally: "low calorie dinner ideas" or "high protein vegetarian meals"
          </p>
        )}
      </div>

      {aiQuotaWarning && (
        <div className={styles.quotaWarning}>
          <span className={styles.warningIcon}>⚠️</span>
          <span>{aiQuotaWarning}</span>
          <button
            className={styles.dismissWarning}
            onClick={() => setAiQuotaWarning(null)}
            aria-label="Dismiss warning"
          >
            ×
          </button>
        </div>
      )}

      {(aiInsights || searchExplanation) && (
        <div className={styles.aiInsights}>
          {searchExplanation && (
            <p className={styles.searchExplanation}>
              <strong>AI understood:</strong> {searchExplanation}
            </p>
          )}
          {aiInsights && (
            <p className={styles.insightsText}>
              <strong>AI insights:</strong> {aiInsights}
            </p>
          )}
        </div>
      )}

      <Link to="/create" className={styles.createBtn}>
        <Button fullWidth>Share a Meal</Button>
      </Link>

      {posts.length === 0 ? (
        <div className={styles.empty}>
          <p>{searchQuery ? 'No posts found' : 'No posts yet. Be the first to share a meal!'}</p>
        </div>
      ) : (
        <InfiniteScroll
          dataLength={posts.length}
          next={loadMore}
          hasMore={hasMore && !useAISearch}
          loader={<Loader />}
          endMessage={<p className={styles.endMessage}>You've seen all posts</p>}
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
