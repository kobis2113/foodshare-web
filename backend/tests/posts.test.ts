import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import path from 'path';
import fs from 'fs';
import app from '../src/index';
import { User } from '../src/models/User';
import { Post } from '../src/models/Post';

let mongoServer: MongoMemoryServer;
let accessToken: string;
let userId: string;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  await mongoose.connect(uri);

  const uploadsDir = path.join(__dirname, '../uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await User.deleteMany({});
  await Post.deleteMany({});

  const res = await request(app)
    .post('/api/web/auth/register')
    .send({
      email: 'test@example.com',
      password: 'password123',
      displayName: 'Test User'
    });

  accessToken = res.body.accessToken;
  userId = res.body.user.id;
});

describe('Posts API', () => {
  describe('GET /api/posts', () => {
    it('should return empty array when no posts', async () => {
      const res = await request(app)
        .get('/api/posts')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.posts).toHaveLength(0);
    });

    it('should return paginated posts', async () => {
      await Post.create({
        author: userId,
        mealName: 'Test Meal',
        image: '/uploads/test.jpg'
      });

      const res = await request(app)
        .get('/api/posts')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.posts).toHaveLength(1);
      expect(res.body.pagination).toBeDefined();
    });

    it('should require authentication', async () => {
      const res = await request(app).get('/api/posts');

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/posts/:id', () => {
    it('should return a single post', async () => {
      const post = await Post.create({
        author: userId,
        mealName: 'Test Meal',
        image: '/uploads/test.jpg'
      });

      const res = await request(app)
        .get(`/api/posts/${post._id}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.mealName).toBe('Test Meal');
    });

    it('should return 404 for non-existent post', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .get(`/api/posts/${fakeId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/posts/:id/like', () => {
    it('should like a post', async () => {
      const post = await Post.create({
        author: userId,
        mealName: 'Test Meal',
        image: '/uploads/test.jpg'
      });

      const res = await request(app)
        .post(`/api/posts/${post._id}/like`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.isLiked).toBe(true);
      expect(res.body.likesCount).toBe(1);
    });

    it('should unlike a liked post', async () => {
      const post = await Post.create({
        author: userId,
        mealName: 'Test Meal',
        image: '/uploads/test.jpg',
        likes: [userId],
        likesCount: 1
      });

      const res = await request(app)
        .post(`/api/posts/${post._id}/like`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.isLiked).toBe(false);
      expect(res.body.likesCount).toBe(0);
    });
  });

  describe('DELETE /api/posts/:id', () => {
    it('should delete own post', async () => {
      const post = await Post.create({
        author: userId,
        mealName: 'Test Meal',
        image: '/uploads/test.jpg'
      });

      const res = await request(app)
        .delete(`/api/posts/${post._id}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);

      const deleted = await Post.findById(post._id);
      expect(deleted).toBeNull();
    });

    it('should not delete others post', async () => {
      const otherUser = await User.create({
        email: 'other@example.com',
        password: 'password123',
        displayName: 'Other User'
      });

      const post = await Post.create({
        author: otherUser._id,
        mealName: 'Test Meal',
        image: '/uploads/test.jpg'
      });

      const res = await request(app)
        .delete(`/api/posts/${post._id}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/posts/search', () => {
    beforeEach(async () => {
      await Post.create([
        { author: userId, mealName: 'Chicken Salad', description: 'Fresh greens', image: '/test.jpg' },
        { author: userId, mealName: 'Beef Burger', description: 'Juicy burger', image: '/test.jpg' },
        { author: userId, mealName: 'Pasta Primavera', description: 'Italian pasta', image: '/test.jpg' }
      ]);
    });

    it('should find posts by meal name', async () => {
      const res = await request(app)
        .get('/api/posts/search?q=chicken')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.posts.length).toBeGreaterThan(0);
    });

    it('should require search query', async () => {
      const res = await request(app)
        .get('/api/posts/search')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(400);
    });
  });
});
