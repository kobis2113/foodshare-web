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

describe('Nutrition API', () => {
  describe('GET /api/nutrition', () => {
    it('should return nutrition data for food query', async () => {
      const res = await request(app)
        .get('/api/nutrition?query=chicken%20salad')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('calories');
      expect(res.body).toHaveProperty('protein');
      expect(res.body).toHaveProperty('carbs');
      expect(res.body).toHaveProperty('fat');
    });

    it('should require query parameter', async () => {
      const res = await request(app)
        .get('/api/nutrition')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(400);
    });

    it('should require authentication', async () => {
      const res = await request(app)
        .get('/api/nutrition?query=chicken');

      expect(res.status).toBe(401);
    });

    it('should include health tips', async () => {
      const res = await request(app)
        .get('/api/nutrition?query=grilled%20salmon')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('healthTips');
      expect(Array.isArray(res.body.healthTips)).toBe(true);
    });
  });
});
