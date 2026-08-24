import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';
import db from '../db/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const notFoundPage = path.resolve(__dirname, '../../public/404.html');

export function handleRedirect(req, res) {
  try {
    const { shortCode } = req.params;

    if (!shortCode) {
      return res.status(404).sendFile(notFoundPage);
    }

    const url = db.prepare('SELECT id, original_url, is_active FROM urls WHERE short_code = ?').get(shortCode);

    if (!url) {
      return res.status(404).sendFile(notFoundPage);
    }

    if (!url.is_active) {
      // Link is deactivated
      return res.status(410).sendFile(notFoundPage);
    }

    // Hash client IP for privacy preservation
    const rawIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
    const ipHash = rawIp ? crypto.createHash('sha256').update(rawIp).digest('hex').substring(0, 16) : null;
    const referrer = req.get('referrer') || req.get('referer') || 'Direct';
    const userAgent = req.get('user-agent') || 'Unknown';

    // Asynchronously update analytics
    try {
      db.prepare('UPDATE urls SET clicks = clicks + 1 WHERE id = ?').run(url.id);
      db.prepare(`
        INSERT INTO clicks (url_id, referrer, user_agent, ip_hash) 
        VALUES (?, ?, ?, ?)
      `).run(url.id, referrer.substring(0, 500), userAgent.substring(0, 500), ipHash);
    } catch (err) {
      console.error('Click logging error:', err);
    }

    // Perform HTTP 302 Found redirect
    return res.redirect(302, url.original_url);
  } catch (err) {
    console.error('Redirect controller error:', err);
    return res.status(500).sendFile(notFoundPage);
  }
}
