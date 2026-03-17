import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import path from 'path';
import fs from 'fs';
import app from '../src/index';
import { User } from '../src/models/User';
import { Post } from '../src/models/Post';
import { Comment } from '../src/models/Comment';

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

  describe('POST /api/posts', () => {
    it('should create a post with image', async () => {
      const testImagePath = path.join(__dirname, 'test-image.jpg');

      // Create a minimal test image if it doesn't exist
      if (!fs.existsSync(testImagePath)) {
        // Create a minimal valid JPEG (1x1 pixel)
        const minimalJpeg = Buffer.from([
          0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
          0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43,
          0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
          0x09, 0x08, 0x0A, 0x0C, 0x14, 0x0D, 0x0C, 0x0B, 0x0B, 0x0C, 0x19, 0x12,
          0x13, 0x0F, 0x14, 0x1D, 0x1A, 0x1F, 0x1E, 0x1D, 0x1A, 0x1C, 0x1C, 0x20,
          0x24, 0x2E, 0x27, 0x20, 0x22, 0x2C, 0x23, 0x1C, 0x1C, 0x28, 0x37, 0x29,
          0x2C, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1F, 0x27, 0x39, 0x3D, 0x38, 0x32,
          0x3C, 0x2E, 0x33, 0x34, 0x32, 0xFF, 0xC0, 0x00, 0x0B, 0x08, 0x00, 0x01,
          0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xFF, 0xC4, 0x00, 0x1F, 0x00, 0x00,
          0x01, 0x05, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00,
          0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,
          0x09, 0x0A, 0x0B, 0xFF, 0xC4, 0x00, 0xB5, 0x10, 0x00, 0x02, 0x01, 0x03,
          0x03, 0x02, 0x04, 0x03, 0x05, 0x05, 0x04, 0x04, 0x00, 0x00, 0x01, 0x7D,
          0x01, 0x02, 0x03, 0x00, 0x04, 0x11, 0x05, 0x12, 0x21, 0x31, 0x41, 0x06,
          0x13, 0x51, 0x61, 0x07, 0x22, 0x71, 0x14, 0x32, 0x81, 0x91, 0xA1, 0x08,
          0x23, 0x42, 0xB1, 0xC1, 0x15, 0x52, 0xD1, 0xF0, 0x24, 0x33, 0x62, 0x72,
          0x82, 0x09, 0x0A, 0x16, 0x17, 0x18, 0x19, 0x1A, 0x25, 0x26, 0x27, 0x28,
          0x29, 0x2A, 0x34, 0x35, 0x36, 0x37, 0x38, 0x39, 0x3A, 0x43, 0x44, 0x45,
          0x46, 0x47, 0x48, 0x49, 0x4A, 0x53, 0x54, 0x55, 0x56, 0x57, 0x58, 0x59,
          0x5A, 0x63, 0x64, 0x65, 0x66, 0x67, 0x68, 0x69, 0x6A, 0x73, 0x74, 0x75,
          0x76, 0x77, 0x78, 0x79, 0x7A, 0x83, 0x84, 0x85, 0x86, 0x87, 0x88, 0x89,
          0x8A, 0x92, 0x93, 0x94, 0x95, 0x96, 0x97, 0x98, 0x99, 0x9A, 0xA2, 0xA3,
          0xA4, 0xA5, 0xA6, 0xA7, 0xA8, 0xA9, 0xAA, 0xB2, 0xB3, 0xB4, 0xB5, 0xB6,
          0xB7, 0xB8, 0xB9, 0xBA, 0xC2, 0xC3, 0xC4, 0xC5, 0xC6, 0xC7, 0xC8, 0xC9,
          0xCA, 0xD2, 0xD3, 0xD4, 0xD5, 0xD6, 0xD7, 0xD8, 0xD9, 0xDA, 0xE1, 0xE2,
          0xE3, 0xE4, 0xE5, 0xE6, 0xE7, 0xE8, 0xE9, 0xEA, 0xF1, 0xF2, 0xF3, 0xF4,
          0xF5, 0xF6, 0xF7, 0xF8, 0xF9, 0xFA, 0xFF, 0xDA, 0x00, 0x08, 0x01, 0x01,
          0x00, 0x00, 0x3F, 0x00, 0xFB, 0xD5, 0xDB, 0x20, 0xA8, 0xF1, 0x4E, 0xA6,
          0xD3, 0x00, 0x00, 0x00, 0x00, 0xFF, 0xD9
        ]);
        fs.writeFileSync(testImagePath, minimalJpeg);
      }

      const res = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${accessToken}`)
        .field('mealName', 'Test Meal')
        .field('description', 'Test description')
        .attach('image', testImagePath);

      expect(res.status).toBe(201);
      expect(res.body.post.mealName).toBe('Test Meal');
      expect(res.body.post.image).toBeDefined();

      // Cleanup
      if (fs.existsSync(testImagePath)) {
        fs.unlinkSync(testImagePath);
      }
    });

    it('should require image', async () => {
      const res = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${accessToken}`)
        .field('mealName', 'Test Meal');

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Image is required');
    });

    it('should require meal name', async () => {
      const testImagePath = path.join(__dirname, 'test-image.jpg');
      const minimalJpeg = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xFF, 0xD9]);
      fs.writeFileSync(testImagePath, minimalJpeg);

      const res = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${accessToken}`)
        .attach('image', testImagePath);

      expect(res.status).toBe(400);

      fs.unlinkSync(testImagePath);
    });
  });

  describe('PUT /api/posts/:id', () => {
    it('should update own post', async () => {
      const post = await Post.create({
        author: userId,
        mealName: 'Original Meal',
        description: 'Original description',
        image: '/uploads/test.jpg'
      });

      const res = await request(app)
        .put(`/api/posts/${post._id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .field('mealName', 'Updated Meal')
        .field('description', 'Updated description');

      expect(res.status).toBe(200);
      expect(res.body.post.mealName).toBe('Updated Meal');
      expect(res.body.post.description).toBe('Updated description');
    });

    it('should not update others post', async () => {
      const otherUser = await User.create({
        email: 'other@example.com',
        password: 'password123',
        displayName: 'Other User'
      });

      const post = await Post.create({
        author: otherUser._id,
        mealName: 'Other Meal',
        image: '/uploads/test.jpg'
      });

      const res = await request(app)
        .put(`/api/posts/${post._id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .field('mealName', 'Hacked Meal');

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/posts/:id/likes', () => {
    it('should return users who liked the post', async () => {
      const post = await Post.create({
        author: userId,
        mealName: 'Liked Meal',
        image: '/uploads/test.jpg',
        likes: [userId],
        likesCount: 1
      });

      const res = await request(app)
        .get(`/api/posts/${post._id}/likes`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.users).toHaveLength(1);
    });
  });

  describe('Comments API', () => {
    let postId: string;

    beforeEach(async () => {
      const post = await Post.create({
        author: userId,
        mealName: 'Test Meal',
        image: '/uploads/test.jpg'
      });
      postId = post._id.toString();
    });

    it('should get comments for a post', async () => {
      const res = await request(app)
        .get(`/api/posts/${postId}/comments`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.comments).toBeDefined();
      expect(Array.isArray(res.body.comments)).toBe(true);
    });

    it('should add a comment', async () => {
      const res = await request(app)
        .post(`/api/posts/${postId}/comments`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ text: 'Great meal!' });

      expect(res.status).toBe(201);
      expect(res.body.comment.text).toBe('Great meal!');
    });

    it('should require comment text', async () => {
      const res = await request(app)
        .post(`/api/posts/${postId}/comments`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({});

      expect(res.status).toBe(400);
    });

    it('should delete own comment', async () => {
      // First create a comment
      const createRes = await request(app)
        .post(`/api/posts/${postId}/comments`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ text: 'To be deleted' });

      const commentId = createRes.body.comment._id;

      const res = await request(app)
        .delete(`/api/posts/${postId}/comments/${commentId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
    });
  });
});
