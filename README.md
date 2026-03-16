# FoodShare - Web Application

**Share your meals with the world!**

A full-stack web application for sharing food photos with nutrition information.

## Authors
- **Kobi Shabaton** (212358477)
- **Itay Benbenisti** (212374797)

## Tech Stack

### Backend
- Node.js + Express
- TypeScript
- MongoDB (local)
- JWT Authentication + OAuth (Google)
- Swagger API Documentation
- Jest Testing

### Frontend
- React + TypeScript
- Vite
- TailwindCSS

## Features
- User authentication (register, login, OAuth)
- Post meals with images and descriptions
- Nutrition information from external API
- Like and comment on posts
- User profiles with stats
- Infinite scroll feed

## Project Structure
```
foodshare-web/
├── backend/           # Node.js + Express API
│   ├── src/
│   │   ├── config/    # Database, Swagger config
│   │   ├── middleware/# Auth middleware (JWT, Firebase)
│   │   ├── models/    # Mongoose models
│   │   ├── routes/    # API routes
│   │   └── index.ts   # Entry point
│   └── tests/         # Jest tests
│
└── frontend/          # React application
    └── src/
        ├── components/
        ├── pages/
        ├── services/
        └── hooks/
```

## Getting Started

### Backend
```bash
cd backend
npm install
cp .env.example .env  # Configure environment
npm run dev           # Development server
npm test              # Run tests
```

### Frontend
```bash
cd frontend
npm install
npm run dev           # Development server
npm run build         # Production build
```

## API Documentation
Swagger docs available at: `http://localhost:3000/api-docs`

## License
ISC
