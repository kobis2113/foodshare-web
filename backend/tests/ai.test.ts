import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/index';
import { User } from '../src/models/User';

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
    it('should analyze a meal', async () => {
      const res = await request(app)
        .post('/api/ai/analyze')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          mealName: 'Grilled Chicken',
          description: 'With vegetables',
          nutrition: { calories: 350, protein: 35, carbs: 10, fat: 15 }
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('analysis');
      expect(res.body).toHaveProperty('source');
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
    it('should return meal suggestions', async () => {
      const res = await request(app)
        .post('/api/ai/suggest')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          preferences: 'healthy',
          calories: 500
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('suggestions');
      expect(Array.isArray(res.body.suggestions)).toBe(true);
    });
  });

  describe('POST /api/ai/tips', () => {
    it('should return health tips', async () => {
      const res = await request(app)
        .post('/api/ai/tips')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          mealName: 'Quinoa Bowl',
          nutrition: { calories: 400, protein: 15, carbs: 60, fat: 10 }
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('tips');
      expect(Array.isArray(res.body.tips)).toBe(true);
    });

    it('should require meal name', async () => {
      const res = await request(app)
        .post('/api/ai/tips')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({});

      expect(res.status).toBe(400);
    });
  });
});
