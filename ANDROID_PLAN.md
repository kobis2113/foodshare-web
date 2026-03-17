# FoodShare Android App - Development Plan

## Authors
- **Kobi Shabaton** (212358477)
- **Itay Benbenisti** (212374797)

---

## Course Requirements Checklist

### Core Requirements
- [ ] Kotlin + Android SDK
- [ ] MVVM Architecture
- [ ] Firebase Authentication
- [ ] Room Database (local caching)
- [ ] Backend REST API integration
- [ ] Image upload (camera/gallery)
- [ ] Material Design UI
- [ ] RecyclerView with pagination

### Feature Requirements
- [ ] User registration & login (Firebase)
- [ ] Auto-login (persistent auth)
- [ ] User profile (view & edit)
- [ ] Post CRUD (create, read, update, delete)
- [ ] Image upload with posts
- [ ] Infinite scroll / pagination
- [ ] Like/unlike posts
- [ ] Comments system
- [ ] Profile picture upload
- [ ] Logout functionality
- [ ] Search posts

### Code Quality
- [ ] MVVM pattern (ViewModel + Repository)
- [ ] Dependency Injection (Hilt)
- [ ] Clean, modular code
- [ ] Proper error handling
- [ ] Loading states

---

## Development Phases

### Phase 1: Project Setup ✅
- [x] Project structure
- [x] Gradle configuration
- [x] Hilt dependency injection
- [x] Room database setup
- [x] Retrofit API setup
- **Branch:** `main`

### Phase 2: Data Layer ✅
- [x] Data models (User, Post, Comment)
- [x] API interfaces
- [x] Repositories (Auth, Post, User)
- [x] Room DAOs
- **Branch:** `feature/data-layer`

### Phase 3: Authentication
- [ ] Firebase setup
- [ ] SplashActivity with auto-login
- [ ] LoginFragment
- [ ] RegisterFragment
- [ ] AuthViewModel
- **Branch:** `feature/auth`

### Phase 4: Navigation & Main Screen
- [ ] Navigation graph
- [ ] MainActivity with bottom navigation
- [ ] Auth navigation graph
- **Branch:** `feature/navigation`

### Phase 5: Feed Feature
- [ ] FeedFragment with RecyclerView
- [ ] PostAdapter with ViewHolder
- [ ] Infinite scroll pagination
- [ ] Pull to refresh
- [ ] FeedViewModel
- **Branch:** `feature/feed`

### Phase 6: Post Detail & Comments
- [ ] PostDetailFragment
- [ ] Nutrition info card
- [ ] Like toggle
- [ ] CommentsFragment
- [ ] Add comment functionality
- **Branch:** `feature/post-detail`

### Phase 7: Create/Edit Post
- [ ] AddPostFragment
- [ ] Camera/Gallery image picker
- [ ] EditPostFragment
- [ ] Delete confirmation dialog
- [ ] PostViewModel
- **Branch:** `feature/create-post`

### Phase 8: Profile
- [ ] ProfileFragment
- [ ] Profile header with stats
- [ ] EditProfileFragment
- [ ] MyPostsFragment
- [ ] LikedPostsFragment
- **Branch:** `feature/profile`

### Phase 9: Search
- [ ] SearchFragment
- [ ] Search API integration
- [ ] Search results display
- **Branch:** `feature/search`

### Phase 10: Polish & Testing
- [ ] Loading states (shimmer)
- [ ] Error handling (Snackbars)
- [ ] Empty states
- [ ] UI polish
- **Branch:** `feature/polish`

---

## Screens

| Screen | Description | Status |
|--------|-------------|--------|
| SplashActivity | Logo + loading, auto-login check | ⏳ |
| LoginFragment | Email/password login | ⏳ |
| RegisterFragment | User registration | ⏳ |
| FeedFragment | Posts feed with pagination | ⏳ |
| PostDetailFragment | Post detail with nutrition | ⏳ |
| CommentsFragment | Comments list + input | ⏳ |
| AddPostFragment | Create new post | ⏳ |
| EditPostFragment | Edit existing post | ⏳ |
| ProfileFragment | User profile + menu | ⏳ |
| EditProfileFragment | Edit display name/avatar | ⏳ |
| MyPostsFragment | Grid of user's posts | ⏳ |
| LikedPostsFragment | Grid of liked posts | ⏳ |

---

## Tech Stack

| Category | Technology |
|----------|------------|
| Language | Kotlin |
| Architecture | MVVM |
| DI | Hilt |
| Networking | Retrofit + OkHttp |
| Local Storage | Room |
| Auth | Firebase Auth |
| Images | Glide |
| Navigation | Navigation Component |
| UI | Material Design 3 |

---

## API Endpoints Used

### Auth
- `POST /api/mobile/auth/sync` - Sync Firebase user
- `GET /api/mobile/auth/me` - Get current user

### Posts
- `GET /api/posts` - Get feed (paginated)
- `GET /api/posts/:id` - Get post detail
- `POST /api/posts` - Create post
- `PUT /api/posts/:id` - Update post
- `DELETE /api/posts/:id` - Delete post
- `POST /api/posts/:id/like` - Toggle like
- `GET /api/posts/:id/comments` - Get comments
- `POST /api/posts/:id/comments` - Add comment
- `GET /api/posts/search` - Search posts

### Users
- `GET /api/users/me` - Get profile
- `PUT /api/users/me` - Update profile
- `GET /api/users/me/posts` - My posts
- `GET /api/users/me/liked` - Liked posts

### Nutrition
- `GET /api/nutrition` - Get nutrition info

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
3. Test feature thoroughly
4. Push and create PR to `develop`
5. Merge after review
6. Delete feature branch

---

## Environment Setup

### Firebase
1. Create Firebase project
2. Add Android app (com.foodshare)
3. Download google-services.json
4. Enable Email/Password auth
5. Get service account credentials for backend

### Backend
- URL: `http://10.0.2.2:3000/` (emulator)
- URL: `http://YOUR_IP:3000/` (physical device)

---

## Current Progress

### Completed
1. ✅ Project structure setup
2. ✅ Gradle configuration
3. ✅ Data models
4. ✅ API interfaces
5. ✅ Repositories
6. ✅ Room database

### In Progress
- Phase 3: Authentication

### Next Up
- Phase 4: Navigation
- Phase 5: Feed Feature

---

## Notes

- All commits by Kobi Shabaton
- Backend URL for emulator: 10.0.2.2:3000
- Firebase required for auth
- Match UI to mockup designs
