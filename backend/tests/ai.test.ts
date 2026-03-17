import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/index';
import { User } from '../src/models/User';
import { Post } from '../src/models/Post';

let mongoServer: MongoMemoryServer;
let accessToken: string;

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

  const res = await request(app)
    .post('/api/web/auth/register')
    .send({
      email: 'test@example.com',
      password: 'password123',
      displayName: 'Test User'
    });

  accessToken = res.body.accessToken;
});

describe('AI API', () => {
  describe('POST /api/ai/analyze', () => {
    it('should require authentication', async () => {
      const res = await request(app)
        .post('/api/ai/analyze')
        .send({ mealName: 'Test' });

      expect(res.status).toBe(401);
    });

    it('should require meal name', async () => {
      const res = await request(app)
        .post('/api/ai/analyze')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({});

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/ai/suggest', () => {
    it('should require authentication', async () => {
      const res = await request(app)
        .post('/api/ai/suggest')
        .send({ preferences: 'healthy' });

      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/ai/tips', () => {
    it('should require authentication', async () => {
      const res = await request(app)
        .post('/api/ai/tips')
        .send({ mealName: 'Test' });

      expect(res.status).toBe(401);
    });

    it('should require meal name', async () => {
      const res = await request(app)
        .post('/api/ai/tips')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({});

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/ai/smart-search', () => {
    it('should require search query', async () => {
      const res = await request(app)
        .get('/api/ai/smart-search')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(400);
    });

    it('should require authentication', async () => {
      const res = await request(app)
        .get('/api/ai/smart-search?q=chicken');

      expect(res.status).toBe(401);
    });

    it('should reject short query', async () => {
      const res = await request(app)
        .get('/api/ai/smart-search?q=a')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(400);
    });
  });
});
