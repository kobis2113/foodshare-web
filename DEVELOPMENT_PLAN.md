# FoodShare - Complete Development Plan

## Team
- **Kobi Shabaton** (kobis2113)
- **Itay Benbenisti** (itayBenben)

---

## Project Status

### Backend - MOSTLY COMPLETE
- [x] User authentication (JWT + refresh tokens)
- [x] Google OAuth
- [x] User profile management
- [x] Posts CRUD
- [x] Image upload
- [x] Likes system
- [x] Comments system
- [x] AI integration (Gemini)
- [x] Nutrition API
- [x] Text search
- [x] Swagger documentation
- [x] Jest unit tests
- [x] Error handling & rate limiting

### Frontend - NOT STARTED
Need to create React + TypeScript app

---

## Development Phases

### Phase 1: Frontend Setup (Kobi)
**Branch:** `feature/frontend-setup`
- Create React app with TypeScript
- Configure project structure
- Set up routing (React Router)
- Configure axios for API calls
- Set up context/state management
- Basic styling setup (CSS/Tailwind)

### Phase 2: Authentication UI (Itay)
**Branch:** `feature/frontend-auth`
- Login page
- Register page
- Google OAuth button
- Token management
- Protected routes
- Auto-login (remember user)
- Logout functionality

### Phase 3: Feed & Posts (Kobi)
**Branch:** `feature/frontend-feed`
- Main feed page
- Post cards display
- Infinite scroll pagination
- Like button functionality
- Comments count display
- Create post modal/page
- Image upload UI

### Phase 4: User Profile (Itay)
**Branch:** `feature/frontend-profile`
- Profile page (view)
- Edit profile functionality
- Profile picture upload
- User's posts display
- Liked posts display

### Phase 5: Post Details & Comments (Kobi)
**Branch:** `feature/frontend-comments`
- Post detail page
- Comments list
- Add comment form
- Edit/delete own posts
- Edit/delete own comments

### Phase 6: AI Features (Itay)
**Branch:** `feature/frontend-ai`
- AI analysis display
- Nutrition info display
- Smart search with AI
- Health tips display
- Meal suggestions

### Phase 7: UI Polish & Design (Both)
**Branch:** `feature/frontend-design`
- Responsive design
- Color scheme
- Animations
- Loading states
- Error states
- Empty states

### Phase 8: Backend Fixes (If needed)
**Branch:** `feature/backend-fixes`
- Fix any API issues found during frontend development
- Update Swagger if needed
- Add missing endpoints

### Phase 9: Deployment Preparation
**Branch:** `feature/deployment`
- Production build configuration
- Environment variables
- PM2 setup
- HTTPS configuration
- College server deployment

---

## Git Workflow

### Branches
- `main` - Production
- `develop` - Integration
- `feature/*` - Feature branches

### PR Rules
- Kobi creates branch → Itay approves PR
- Itay creates branch → Kobi approves PR
- Small, frequent commits
- Descriptive commit messages

---

## Frontend Tech Stack
- React 18+
- TypeScript
- React Router DOM
- Axios
- Context API / Zustand
- CSS Modules / Tailwind CSS
- React Hook Form
- Infinite scroll component

---

## File Structure (Frontend)
```
frontend/
├── public/
├── src/
│   ├── components/
│   │   ├── common/
│   │   ├── auth/
│   │   ├── posts/
│   │   ├── profile/
│   │   └── layout/
│   ├── pages/
│   ├── context/
│   ├── hooks/
│   ├── services/
│   ├── types/
│   ├── utils/
│   ├── styles/
│   ├── App.tsx
│   └── main.tsx
├── package.json
└── tsconfig.json
```

---

## API Base URL
- Development: `http://localhost:3000`
- Production: TBD (college server)

---

## Timeline
1. Phase 1-2: Core setup & auth
2. Phase 3-4: Main features
3. Phase 5-6: Details & AI
4. Phase 7-9: Polish & deploy
