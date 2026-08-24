# MakeMeShort ⚡

A modern, high-performance, full-stack URL shortener featuring instant **Guest Quick-Use Mode** (zero registration required) and a full **User Account Dashboard** with custom vanity slugs, real-time analytics, dynamic QR codes, and link lifecycle management.

---

## 🌟 Key Features

- **⚡ Instant Quick-Use**: Paste and shorten any link on the landing page in `< 20ms` without logging in.
- **📱 Dynamic QR Code Generator**: Automatic high-res QR code creation with one-click download & copy.
- **🎯 Custom Vanity Slugs**: Logged-in users can claim personalized aliases (e.g. `yourdomain.com/launch`).
- **🔐 Secure Authentication**: `bcrypt` password hashing (10 salt rounds) + stateless JWT authentication.
- **📊 Real-Time Click Analytics**: Track visits, referrers, and user agents for each link.
- **🛡️ Enterprise-Grade Security**:
  - Helmet HTTP Security Headers (CSP, XSS protection, anti-clickjacking)
  - Rate limiting against brute-force attacks and link spamming
  - Strict protocol enforcement (`https://`, `http://`)
  - SSRF protection against private IPv4 addresses and cloud metadata services (`169.254.169.254`)
  - Parameterized SQLite queries preventing SQL Injection
- **🎨 Glassmorphic UI**: Ultra-clean responsive dark theme with CSS variables and micro-animations.

---

## 🛠️ Technology Stack

- **Backend**: Node.js, Express.js
- **Database**: SQLite with `better-sqlite3` (WAL mode enabled)
- **Security**: `helmet`, `express-rate-limit`, `bcryptjs`, `jsonwebtoken`, `cors`
- **Frontend**: Vanilla JavaScript (ES Modules), HTML5, CSS3 Glassmorphism, `qrcode`

---

## 🚀 Quick Start

### 1. Clone & Install
```bash
git clone <your-repo-url>
cd makemeshort
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
```

### 3. Run Development Server
```bash
npm run dev
# or for production
npm start
```
Visit **`http://localhost:3000`** in your browser.

### 4. Run Automated Tests
```bash
npm test
```

---

## 🌐 API Reference

### Authentication
- `POST /api/auth/register` — Create a new account (`{ username, email, password }`)
- `POST /api/auth/login` — Sign in (`{ login, password }`)
- `GET /api/auth/me` — Get user profile & aggregate statistics

### Links Management
- `POST /api/urls/shorten` — Shorten a URL (works for guests & logged-in users; custom slugs for users)
- `GET /api/urls` — List all links created by the authenticated user
- `GET /api/urls/:id/stats` — Fetch detailed click logs and visitor stats for a link
- `PATCH /api/urls/:id` — Update destination URL, title, or toggle active status
- `DELETE /api/urls/:id` — Delete a shortened link
- `GET /api/urls/qr?url=<encoded_url>` — Generate QR code image

### Redirection
- `GET /:shortCode` — Fast `302 Found` redirect with click logging

---

## 🚢 Deployment Guide

### Option 1: Render (Recommended — Free Tier Available)
1. Push your repository to GitHub.
2. Sign in to [Render](https://render.com) and click **New Web Service**.
3. Select your GitHub repository.
4. Set the following settings:
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
5. Under **Environment Variables**, add:
   - `NODE_ENV`: `production`
   - `JWT_SECRET`: `<generate-a-random-secret-key>`
   - `BASE_URL`: `https://your-service-name.onrender.com`
6. (Optional) Under **Disks**, attach a persistent disk mounted at `/data` and set `DB_PATH=/data/makemeshort.sqlite` so your database persists across deployments.
7. Click **Deploy**.

### Option 2: Railway / Fly.io / VPS (Docker / Node)
- **Railway**: Click "New Project" -> "Deploy from GitHub repo" -> Set environment variables.
- **VPS (Ubuntu / Debian with PM2 + Nginx)**:
  ```bash
  npm install -g pm2
  pm2 start server/server.js --name "makemeshort"
  pm2 startup && pm2 save
  ```

---

## 📄 License
MIT License
