import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';

import authRoutes from './routes/authRoutes.js';
import urlRoutes from './routes/urlRoutes.js';
import redirectRoutes from './routes/redirectRoutes.js';
import { globalErrorHandler } from './middleware/errorHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.resolve(__dirname, '../public');

const app = express();

// Security Headers with Helmet
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: []
      }
    },
    crossOriginEmbedderPolicy: false
  })
);

// Trust first proxy for cloud platforms (Render, Heroku, Fly.io, Railway)
app.set('trust proxy', 1);

// Security & Parsing Middlewares
app.use(cors());
app.use(express.json({ limit: '100kb' })); // Mitigate body overflow DoS
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

// Rate Limiters for Protection against brute-force and spamming
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Limit each IP to 30 login/register requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts. Please try again in 15 minutes.' }
});

const shortenLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 100, // Limit each IP to 100 shorten requests per 10 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many link shortening requests. Please wait a moment before trying again.' }
});

// Serve static UI assets
app.use(express.static(publicDir));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes with rate limit protection
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/urls/shorten', shortenLimiter);
app.use('/api/urls', urlRoutes);

// Direct short link redirection route
app.use('/', redirectRoutes);

// Error handling
app.use(globalErrorHandler);

export default app;
