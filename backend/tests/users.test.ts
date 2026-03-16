import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
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

describe('Users API', () => {
  describe('GET /api/users/me', () => {
    it('should return current user profile', async () => {
      const res = await request(app)
        .get('/api/users/me')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.email).toBe('test@example.com');
      expect(res.body.displayName).toBe('Test User');
      expect(res.body.stats).toBeDefined();
    });

    it('should require authentication', async () => {
      const res = await request(app).get('/api/users/me');

      expect(res.status).toBe(401);
    });
  });

  describe('PUT /api/users/me', () => {
    it('should update display name', async () => {
      const res = await request(app)
        .put('/api/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ displayName: 'Updated Name' });

      expect(res.status).toBe(200);
      expect(res.body.user.displayName).toBe('Updated Name');
    });

    it('should reject invalid display name', async () => {
      const res = await request(app)
        .put('/api/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ displayName: 'A' });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/users/me/posts', () => {
    it('should return user posts', async () => {
      await Post.create({
        author: userId,
        mealName: 'My Meal',
        image: '/test.jpg'
      });

      const res = await request(app)
        .get('/api/users/me/posts')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.posts).toHaveLength(1);
    });
  });

  describe('GET /api/users/me/liked', () => {
    it('should return liked posts', async () => {
      const post = await Post.create({
        author: userId,
        mealName: 'Liked Meal',
        image: '/test.jpg',
        likes: [userId]
      });

      const res = await request(app)
        .get('/api/users/me/liked')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.posts).toHaveLength(1);
    });
  });

  describe('GET /api/users/:id', () => {
    it('should return user profile by ID', async () => {
      const res = await request(app)
        .get(`/api/users/${userId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.displayName).toBe('Test User');
    });

    it('should return 404 for non-existent user', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .get(`/api/users/${fakeId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(404);
    });
  });
});
