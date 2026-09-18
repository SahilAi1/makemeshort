<h1 align="center">Welcome to makemeshort 👋</h1>
<p>
  <img alt="Version" src="https://img.shields.io/badge/version-1.0.0-blue.svg?cacheSeconds=2592000" />
  <a href="https://github.com/SahilAi1/makemeshort#readme" target="_blank">
    <img alt="Documentation" src="https://img.shields.io/badge/documentation-yes-brightgreen.svg" />
  </a>
  <a href="https://github.com/SahilAi1/makemeshort/graphs/commit-activity" target="_blank">
    <img alt="Maintenance" src="https://img.shields.io/badge/Maintained%3F-yes-green.svg" />
  </a>
  <a href="https://github.com/SahilAi1/makemeshort/blob/master/LICENSE" target="_blank">
    <img alt="License: MIT" src="https://img.shields.io/github/license/SahilAi1/makemeshort" />
  </a>
</p>

> A sleek, high-performance full-stack modern URL shortener with authentication, guest quick-use mode, custom vanity slugs, and real-time analytics.

---

## 🌟 Key Features

- **⚡ Instant Quick-Use**: Shorten any link on the landing page in `< 20ms` without registration.
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
- **🎨 Clean Light UI**: Ultra-clean responsive light theme inspired by modern developer portfolios with subtle micro-grid, crisp typography, and micro-animations.

---

## 🛠️ Technology Stack

- **Backend**: Node.js, Express.js
- **Database**: SQLite with `better-sqlite3` (WAL mode enabled)
- **Security**: `helmet`, `express-rate-limit`, `bcryptjs`, `jsonwebtoken`, `cors`
- **Frontend**: Vanilla JavaScript (ES Modules), HTML5, CSS3, `qrcode`

---

## 🚀 Install

```sh
npm install
```

## 💻 Usage

```sh
# Development mode with watch
npm run dev

# Production mode
npm run start
```

## 🧪 Run tests

```sh
npm run test
```

---

## 🌐 API Reference

### Authentication
- `POST /api/auth/register` — Create a new account (`{ username, email, password }`)
- `POST /api/auth/login` — Sign in (`{ login, password }`)
- `GET /api/auth/me` — Get user profile & aggregate statistics

### Links Management
- `POST /api/urls/shorten` — Shorten a URL (guest & authenticated; custom slugs for users)
- `GET /api/urls` — List all links created by the user
- `GET /api/urls/:id/stats` — Fetch detailed click logs and visitor stats for a link
- `PATCH /api/urls/:id` — Update destination URL, title, or toggle active status
- `DELETE /api/urls/:id` — Delete a shortened link
- `GET /api/urls/qr?url=<encoded_url>` — Generate QR code image

### Redirection
- `GET /:shortCode` — Fast `302 Found` redirect with asynchronous click logging

---

## 🚢 Deployment Guide

### Option 1: Render (Recommended)
1. Push your repository to GitHub.
2. Sign in to [Render](https://render.com) and click **New Web Service**.
3. Select your GitHub repository.
4. Settings:
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
5. Environment Variables:
   - `NODE_ENV`: `production`
   - `JWT_SECRET`: `<generate-a-random-secret-key>`
   - `BASE_URL`: `https://your-service-name.onrender.com`
6. (Optional) Under **Disks**, attach a persistent disk mounted at `/data` and set `DB_PATH=/data/makemeshort.sqlite`.

### Option 2: Docker & Docker Compose
```sh
docker compose up -d --build
```

---

## 👤 Author

👤 **SahilAi1**

* Github: [@SahilAi1](https://github.com/SahilAi1)

## 🤝 Show your support

Give a ⭐️ if this project helped you!

## 📝 License

Copyright © 2026 [SahilAi1](https://github.com/SahilAi1).<br />
This project is [MIT](https://github.com/SahilAi1/makemeshort/blob/master/LICENSE) licensed.
