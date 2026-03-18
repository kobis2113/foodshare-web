import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load .env: prefer process.cwd() (PM2 cwd is backend/), then __dirname/..
const envPaths = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(__dirname, '..', '.env'),
];
const envPath = envPaths.find((p) => fs.existsSync(p));
if (envPath) {
  const result = dotenv.config({ path: envPath });
  if (result.error) console.error('dotenv error:', result.error.message);
  else if (process.env.MONGODB_URI) console.log('Loaded .env from', envPath, '| MONGODB_URI set');
  else console.warn('Loaded .env from', envPath, '| MONGODB_URI missing in .env');
} else {
  console.error('No .env file found. Tried:', envPaths.join(', '));
  console.error('   Create backend/.env (e.g. copy from .env.example) on the server.');
}

import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import passport from 'passport';
import swaggerSpec from './config/swagger';
import { connectDB } from './config/database';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { apiLimiter, authLimiter } from './middleware/rateLimit';

import './config/passport';

import webAuthRoutes from './routes/web/auth';
// FIREBASE REMOVED: import mobileAuthRoutes from './routes/mobile/auth';
import sharedPostRoutes from './routes/shared/posts';
import sharedUserRoutes from './routes/shared/users';
import nutritionRoutes from './routes/shared/nutrition';
import aiRoutes from './routes/shared/ai';

const app: Application = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));
app.use(cors());
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(passport.initialize());

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use('/api/web/auth', authLimiter, webAuthRoutes);
// FIREBASE REMOVED: app.use('/api/mobile/auth', authLimiter, mobileAuthRoutes);

app.use('/api/posts', apiLimiter, sharedPostRoutes);
app.use('/api/users', apiLimiter, sharedUserRoutes);
app.use('/api/nutrition', apiLimiter, nutritionRoutes);
app.use('/api/ai', apiLimiter, aiRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.get('/', (req, res) => {
  res.json({
    message: 'FoodShare API',
    version: '1.0.0',
    docs: '/api-docs',
    authors: 'Kobi Shabaton & Itay Benbenisti'
  });
});

app.use(notFoundHandler);
app.use(errorHandler);

const startServer = async () => {
  try {
    await connectDB();
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on port ${PORT} and listening on 0.0.0.0`);
      console.log(`Swagger docs: http://0.0.0.0:${PORT}/api-docs`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export default app;
