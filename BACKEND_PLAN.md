# FoodShare Backend - Development Plan

## Authors
- **Kobi Shabaton** (212358477)
- **Itay Benbenisti** (212374797)

---

## Course Requirements Checklist

### Core Requirements
- [x] Node.js + Express backend
- [x] TypeScript mandatory
- [x] Local MongoDB only (no Atlas)
- [x] Images stored on server filesystem
- [x] JWT with refresh tokens
- [ ] OAuth integration (Google)
- [ ] AI integration (Gemini/ChatGPT)
- [ ] Free-text search functionality
- [x] Swagger API documentation
- [ ] Jest unit tests (all APIs)
- [ ] Deploy to college server
- [ ] HTTPS encryption
- [ ] PM2 process manager

### Feature Requirements
- [x] User registration & login
- [x] User profiles (view & edit)
- [x] Post CRUD (create, read, update, delete)
- [x] Image upload with posts
- [x] Infinite scroll / pagination
- [x] Like/unlike posts
- [x] Comments system
- [x] External REST API (Nutrition)
- [ ] Profile picture upload
- [x] Auto-login (JWT refresh)
- [x] Logout functionality

### Code Quality
- [x] MVVM-like structure (routes/controllers/models)
- [x] No code duplication
- [x] Clean, modular code
- [ ] Proper error handling middleware
- [ ] Request validation
- [ ] Rate limiting

---

## Development Phases

### Phase 1: Core Backend Setup ✅
- [x] Project structure
- [x] Database configuration
- [x] User model
- [x] Post model
- [x] Comment model
- [x] JWT authentication middleware
- [x] Firebase authentication middleware
- [x] Basic routes

### Phase 2: Authentication Completion
- [ ] Google OAuth implementation
- [ ] OAuth callback handling
- [ ] Link OAuth to existing users
- [ ] Improve token refresh flow
- **Branch:** `feature/oauth-google`

### Phase 3: AI Integration
- [ ] Gemini/ChatGPT API setup
- [ ] Smart nutrition analysis
- [ ] Health tips generation
- [ ] Meal suggestions
- **Branch:** `feature/ai-integration`

### Phase 4: Search Functionality
- [ ] Text search on posts (meal name, description)
- [ ] Search indexing in MongoDB
- [ ] Search API endpoint
- **Branch:** `feature/search`

### Phase 5: Testing
- [ ] Jest configuration ✅
- [ ] Auth API tests
- [ ] Posts API tests
- [ ] Users API tests
- [ ] Nutrition API tests
- [ ] Test coverage report
- **Branch:** `feature/tests`

### Phase 6: Error Handling & Validation
- [ ] Global error handler middleware
- [ ] Consistent error responses
- [ ] Input validation improvements
- [ ] Rate limiting
- **Branch:** `feature/error-handling`

### Phase 7: Deployment Preparation
- [ ] Production environment config
- [ ] PM2 configuration
- [ ] HTTPS setup guide
- [ ] College server deployment
- **Branch:** `feature/deployment`

---

## API Endpoints Summary

### Authentication (Web)
| Method | Endpoint | Description | Status |
|--------|----------|-------------|--------|
| POST | `/api/web/auth/register` | Register new user | ✅ |
| POST | `/api/web/auth/login` | Login with email/password | ✅ |
| POST | `/api/web/auth/refresh` | Refresh access token | ✅ |
| POST | `/api/web/auth/logout` | Logout user | ✅ |
| GET | `/api/web/auth/google` | Google OAuth redirect | ❌ |
| GET | `/api/web/auth/google/callback` | Google OAuth callback | ❌ |

### Authentication (Mobile)
| Method | Endpoint | Description | Status |
|--------|----------|-------------|--------|
| POST | `/api/mobile/auth/sync` | Sync Firebase user | ✅ |
| GET | `/api/mobile/auth/me` | Get current user | ✅ |

### Posts
| Method | Endpoint | Description | Status |
|--------|----------|-------------|--------|
| GET | `/api/posts` | Get all posts (paginated) | ✅ |
| GET | `/api/posts/:id` | Get post by ID | ✅ |
| POST | `/api/posts` | Create new post | ✅ |
| PUT | `/api/posts/:id` | Update post | ✅ |
| DELETE | `/api/posts/:id` | Delete post | ✅ |
| POST | `/api/posts/:id/like` | Like/unlike post | ✅ |
| GET | `/api/posts/:id/comments` | Get post comments | ✅ |
| POST | `/api/posts/:id/comments` | Add comment | ✅ |
| GET | `/api/posts/search` | Search posts | ❌ |

### Users
| Method | Endpoint | Description | Status |
|--------|----------|-------------|--------|
| GET | `/api/users/me` | Get current user profile | ✅ |
| PUT | `/api/users/me` | Update profile | ✅ |
| GET | `/api/users/me/posts` | Get my posts | ✅ |
| GET | `/api/users/me/liked` | Get liked posts | ✅ |
| GET | `/api/users/:id` | Get user by ID | ✅ |

### Nutrition
| Method | Endpoint | Description | Status |
|--------|----------|-------------|--------|
| GET | `/api/nutrition` | Get nutrition info | ✅ |

### AI (To be implemented)
| Method | Endpoint | Description | Status |
|--------|----------|-------------|--------|
| POST | `/api/ai/analyze` | Analyze meal with AI | ❌ |
| POST | `/api/ai/suggest` | Get meal suggestions | ❌ |

---

## Git Workflow

### Branches
- `main` - Production-ready code
- `develop` - Integration branch
- `feature/*` - Feature branches

### Commit Convention
```
type(scope): description

Types: feat, fix, docs, style, refactor, test, chore
```

### PR Flow
1. Create feature branch from `develop`
2. Implement feature with commits
3. Push and create PR to `develop`
4. Merge after review
5. Delete feature branch

---

## Environment Variables

```env
# Server
PORT=3000
NODE_ENV=development

# MongoDB
MONGODB_URI=mongodb://localhost:27017/foodshare

# JWT
JWT_SECRET=<secret>
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=<secret>
JWT_REFRESH_EXPIRES_IN=7d

# Google OAuth
GOOGLE_CLIENT_ID=<client-id>
GOOGLE_CLIENT_SECRET=<client-secret>
GOOGLE_CALLBACK_URL=http://localhost:3000/api/web/auth/google/callback

# Firebase (for mobile auth verification)
FIREBASE_PROJECT_ID=<project-id>
FIREBASE_PRIVATE_KEY=<private-key>
FIREBASE_CLIENT_EMAIL=<client-email>

# AI (Gemini)
GEMINI_API_KEY=<api-key>

# Nutrition API
NUTRITION_API_KEY=<api-key>
NUTRITION_API_URL=https://api.calorieninjas.com/v1/nutrition

# Upload
UPLOAD_DIR=uploads
MAX_FILE_SIZE=5242880
```

---

## Current Progress

### Completed
1. ✅ Initial project setup
2. ✅ Database configuration
3. ✅ User/Post/Comment models
4. ✅ JWT authentication
5. ✅ Firebase authentication
6. ✅ Basic CRUD routes
7. ✅ Image upload
8. ✅ Pagination
9. ✅ Like system
10. ✅ Comments system
11. ✅ Swagger setup

### In Progress
- Phase 2: OAuth Google integration

### Next Up
- Phase 3: AI Integration
- Phase 4: Search
- Phase 5: Testing

---

## Notes

- All commits must be by Kobi Shabaton
- MongoDB must be local (college requirement)
- Images stored on server, not database
- Swagger docs at `/api-docs`
- Jest tests required for all API endpoints
