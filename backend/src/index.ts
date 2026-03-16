import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import swaggerUi from 'swagger-ui-express';
import passport from 'passport';
import swaggerSpec from './config/swagger';
import { connectDB } from './config/database';

// Initialize passport strategies
import './config/passport';

// Route imports
import webAuthRoutes from './routes/web/auth';
import mobileAuthRoutes from './routes/mobile/auth';
import sharedPostRoutes from './routes/shared/posts';
import sharedUserRoutes from './routes/shared/users';
import nutritionRoutes from './routes/shared/nutrition';

// Load environment variables
dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(passport.initialize());

// Static files for uploaded images
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Swagger Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// API Routes
// Web routes (JWT authentication)
app.use('/api/web/auth', webAuthRoutes);

// Mobile routes (Firebase authentication)
app.use('/api/mobile/auth', mobileAuthRoutes);

// Shared routes (both auth methods supported)
app.use('/api/posts', sharedPostRoutes);
app.use('/api/users', sharedUserRoutes);
app.use('/api/nutrition', nutritionRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'FoodShare API',
    version: '1.0.0',
    docs: '/api-docs',
    authors: 'Kobi Shabaton & Itay Benbenisti'
  });
});

// Start server
const startServer = async () => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📚 Swagger docs: http://localhost:${PORT}/api-docs`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export default app;
