import crypto from 'crypto';

const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

export function generateShortCode(length = 6) {
  const bytes = crypto.randomBytes(length);
  let result = '';
  for (let i = 0; i < length; i++) {
    result += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return result;
}

export function isValidSlug(slug) {
  // Allow alphanumeric characters, hyphens, and underscores, between 2 and 50 chars
  // Disallow reserved routes
  const reservedWords = [
    'api', 'dashboard', 'login', 'register', 'logout', '404', 
    'css', 'js', 'assets', 'favicon.ico', 'robots.txt', 'health'
  ];
  
  if (!slug || typeof slug !== 'string') return false;
  const cleanSlug = slug.trim().toLowerCase();
  
  if (cleanSlug.length < 2 || cleanSlug.length > 50) return false;
  if (!/^[a-zA-Z0-9_-]+$/.test(cleanSlug)) return false;
  if (reservedWords.includes(cleanSlug)) return false;
  
  return true;
}
