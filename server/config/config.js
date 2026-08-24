import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../');

export const config = {
  port: process.env.PORT || 3000,
  jwtSecret: process.env.JWT_SECRET || 'makemeshort-super-secure-jwt-secret-key-2026',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  baseUrl: process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`,
  dbPath: process.env.DB_PATH || path.join(rootDir, 'makemeshort.sqlite'),
  env: process.env.NODE_ENV || 'development'
};
