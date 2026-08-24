import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config/config.js';
import db from '../db/database.js';

export async function register(req, res) {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required' });
    }

    const cleanUsername = username.trim().toLowerCase();
    const cleanEmail = email.trim().toLowerCase();

    if (cleanUsername.length < 3 || cleanUsername.length > 30) {
      return res.status(400).json({ error: 'Username must be between 3 and 30 characters' });
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(cleanUsername)) {
      return res.status(400).json({ error: 'Username can only contain letters, numbers, hyphens, and underscores' });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return res.status(400).json({ error: 'Please provide a valid email address' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    // Check if username or email already exists
    const existing = db.prepare('SELECT id, username, email FROM users WHERE username = ? OR email = ?').get(cleanUsername, cleanEmail);
    if (existing) {
      if (existing.username.toLowerCase() === cleanUsername) {
        return res.status(409).json({ error: 'Username is already taken' });
      }
      return res.status(409).json({ error: 'Email is already registered' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const stmt = db.prepare('INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)');
    const result = stmt.run(cleanUsername, cleanEmail, passwordHash);

    const user = {
      id: result.lastInsertRowid,
      username: cleanUsername,
      email: cleanEmail
    };

    const token = jwt.sign({ id: user.id, username: user.username }, config.jwtSecret, {
      expiresIn: config.jwtExpiresIn
    });

    return res.status(201).json({
      message: 'Account created successfully',
      user,
      token
    });
  } catch (err) {
    console.error('Registration error:', err);
    return res.status(500).json({ error: 'Internal server error during registration' });
  }
}

export async function login(req, res) {
  try {
    const { login, password } = req.body;

    if (!login || !password) {
      return res.status(400).json({ error: 'Username/email and password are required' });
    }

    const cleanLogin = login.trim().toLowerCase();
    const user = db.prepare('SELECT * FROM users WHERE username = ? OR email = ?').get(cleanLogin, cleanLogin);

    if (!user) {
      return res.status(401).json({ error: 'Invalid username/email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid username/email or password' });
    }

    const userData = {
      id: user.id,
      username: user.username,
      email: user.email,
      created_at: user.created_at
    };

    const token = jwt.sign({ id: user.id, username: user.username }, config.jwtSecret, {
      expiresIn: config.jwtExpiresIn
    });

    return res.json({
      message: 'Logged in successfully',
      user: userData,
      token
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Internal server error during login' });
  }
}

export function getMe(req, res) {
  try {
    const user = req.user;
    
    // Get user statistics
    const stats = db.prepare(`
      SELECT 
        COUNT(*) as total_links,
        COALESCE(SUM(clicks), 0) as total_clicks
      FROM urls 
      WHERE user_id = ?
    `).get(user.id);

    return res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        created_at: user.created_at,
        stats: {
          totalLinks: stats.total_links,
          totalClicks: stats.total_clicks
        }
      }
    });
  } catch (err) {
    console.error('GetMe error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
