import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/index';
import { User } from '../src/models/User';

let mongoServer: MongoMemoryServer;

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
});

describe('Auth API', () => {
  const testUser = {
    email: 'test@example.com',
    password: 'password123',
    displayName: 'Test User'
  };

  describe('POST /api/web/auth/register', () => {
    it('should register a new user', async () => {
      const res = await request(app)
        .post('/api/web/auth/register')
        .send(testUser);

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('refreshToken');
      expect(res.body.user.email).toBe(testUser.email);
    });

    it('should reject duplicate email', async () => {
      await request(app)
        .post('/api/web/auth/register')
        .send(testUser);

      const res = await request(app)
        .post('/api/web/auth/register')
        .send(testUser);

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('User already exists');
    });

    it('should reject invalid email', async () => {
      const res = await request(app)
        .post('/api/web/auth/register')
        .send({ ...testUser, email: 'invalid-email' });

      expect(res.status).toBe(400);
    });

    it('should reject short password', async () => {
      const res = await request(app)
        .post('/api/web/auth/register')
        .send({ ...testUser, password: '123' });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/web/auth/login', () => {
    beforeEach(async () => {
      await request(app)
        .post('/api/web/auth/register')
        .send(testUser);
    });

    it('should login with valid credentials', async () => {
      const res = await request(app)
        .post('/api/web/auth/login')
        .send({ email: testUser.email, password: testUser.password });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('refreshToken');
    });

    it('should reject invalid password', async () => {
      const res = await request(app)
        .post('/api/web/auth/login')
        .send({ email: testUser.email, password: 'wrongpassword' });

      expect(res.status).toBe(401);
    });

    it('should reject non-existent user', async () => {
      const res = await request(app)
        .post('/api/web/auth/login')
        .send({ email: 'nobody@example.com', password: 'password123' });

      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/web/auth/refresh', () => {
    it('should refresh tokens', async () => {
      const registerRes = await request(app)
        .post('/api/web/auth/register')
        .send(testUser);

      const { refreshToken } = registerRes.body;

      const res = await request(app)
        .post('/api/web/auth/refresh')
        .send({ refreshToken });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('refreshToken');
    });

    it('should reject invalid refresh token', async () => {
      const res = await request(app)
        .post('/api/web/auth/refresh')
        .send({ refreshToken: 'invalid-token' });

      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/web/auth/logout', () => {
    it('should logout successfully', async () => {
      const registerRes = await request(app)
        .post('/api/web/auth/register')
        .send(testUser);

      const { accessToken, refreshToken } = registerRes.body;

      const res = await request(app)
        .post('/api/web/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ refreshToken });

      expect(res.status).toBe(200);
    });
  });
});
