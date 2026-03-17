import swaggerJsdoc from 'swagger-jsdoc';

const PORT = process.env.PORT || 3000;
const API_URL = process.env.API_URL || `http://localhost:${PORT}`;
const NODE_ENV = process.env.NODE_ENV || 'development';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'FoodShare API',
      version: '1.0.0',
      description: 'FoodShare - Share your meals with the world! API documentation for both Web and Mobile clients.',
      contact: {
        name: 'Kobi Shabaton & Itay Benbenisti'
      }
    },
    servers: [
      {
        url: API_URL,
        description: `${NODE_ENV.charAt(0).toUpperCase() + NODE_ENV.slice(1)} server`
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token for web authentication'
        },
        firebaseAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'Firebase',
          description: 'Firebase ID token for mobile authentication'
        }
      }
    },
    tags: [
      { name: 'Web Auth', description: 'Authentication endpoints for web app (JWT)' },
      { name: 'Mobile Auth', description: 'Authentication endpoints for mobile app (Firebase)' },
      { name: 'Posts', description: 'Post CRUD operations' },
      { name: 'Users', description: 'User profile operations' },
      { name: 'Nutrition', description: 'External nutrition API integration' }
    ]
  },
  apis: ['./src/routes/**/*.ts', './src/models/*.ts']
};

const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;
