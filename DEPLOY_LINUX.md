## FoodShare backend deployment (Linux + Docker + Nginx)

This repo currently contains the backend API. MongoDB is assumed to already be running elsewhere, and the connection string is provided via `MONGODB_URI` in `.env`.

### 1) Prereqs on the server
- Docker Engine + Docker Compose plugin installed
- DNS points your domain to the server (optional but recommended)
- Firewall allows `80/tcp` (and `443/tcp` if enabling TLS)

### 2) Create a production `.env` (on the server)
Create `foodshare-web/.env` (do not commit it):

```bash
PORT=3000
NODE_ENV=production
MONGODB_URI=mongodb://<user>:<pass>@<mongo-host>:27017/foodshare?authSource=admin

JWT_SECRET=change-me
JWT_REFRESH_SECRET=change-me

# If you use these features, set them too:
FRONTEND_URL=https://your-domain.example
GOOGLE_CALLBACK_URL=https://your-domain.example/api/web/auth/google/callback
GEMINI_API_KEY=...
NUTRITION_API_KEY=...

UPLOAD_DIR=uploads
MAX_FILE_SIZE=5242880
```

### 3) Deploy
From the repo root on the server:

```bash
docker compose up -d --build
docker compose ps
```

Health check:

```bash
curl -f http://127.0.0.1/health
```

### 4) Uploads persistence
Uploads are persisted in a named Docker volume: `backend_uploads`.

List volumes:

```bash
docker volume ls
```

### 5) HTTPS (recommended)
This repo ships Nginx for HTTP. For HTTPS you have two common options:

- Option A (recommended): run Nginx on the host + Certbot/Let’s Encrypt, and keep this compose exposing backend only.
- Option B: terminate TLS inside the Nginx container (mount certs and add a `443` server block).

If you tell me which option you prefer, I’ll add the exact config files for it.

