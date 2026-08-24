import QRCode from 'qrcode';
import db from '../db/database.js';
import { config } from '../config/config.js';
import { generateShortCode, isValidSlug } from '../utils/nanoid.js';
import { normalizeAndValidateUrl } from '../utils/urlValidator.js';

export async function shortenUrl(req, res) {
  try {
    const { originalUrl, customSlug, title } = req.body;
    const userId = req.user ? req.user.id : null;

    if (!originalUrl) {
      return res.status(400).json({ error: 'Original URL is required' });
    }

    // Determine host for self-reference check
    const hostHeader = req.get('host');
    const validation = normalizeAndValidateUrl(originalUrl, hostHeader);
    if (!validation.isValid) {
      return res.status(400).json({ error: validation.error });
    }
    const cleanOriginalUrl = validation.url;

    let finalShortCode = '';

    if (customSlug) {
      // Custom slugs are a premium authenticated feature
      if (!userId) {
        return res.status(403).json({ error: 'Custom aliases require a free user account. Please log in or sign up.' });
      }

      const cleanSlug = customSlug.trim();
      if (!isValidSlug(cleanSlug)) {
        return res.status(400).json({ 
          error: 'Custom alias must be 2-50 characters, contain only letters, numbers, hyphens, and underscores, and not use reserved keywords.' 
        });
      }

      // Check if slug is already taken
      const existing = db.prepare('SELECT id FROM urls WHERE short_code = ?').get(cleanSlug);
      if (existing) {
        return res.status(409).json({ error: `Alias "${cleanSlug}" is already taken. Please choose another.` });
      }

      finalShortCode = cleanSlug;
    } else {
      // Generate random code with collision prevention
      let attempts = 0;
      while (attempts < 10) {
        const candidate = generateShortCode(6);
        const existing = db.prepare('SELECT id FROM urls WHERE short_code = ?').get(candidate);
        if (!existing) {
          finalShortCode = candidate;
          break;
        }
        attempts++;
      }

      if (!finalShortCode) {
        return res.status(500).json({ error: 'Failed to generate unique short code. Please try again.' });
      }
    }

    // Auto-generate title if not provided
    let finalTitle = title ? title.trim() : null;
    if (!finalTitle) {
      try {
        const parsed = new URL(cleanOriginalUrl);
        finalTitle = parsed.hostname + (parsed.pathname !== '/' ? parsed.pathname.slice(0, 20) : '');
      } catch (e) {
        finalTitle = cleanOriginalUrl.slice(0, 30);
      }
    }

    const stmt = db.prepare(`
      INSERT INTO urls (user_id, original_url, short_code, title) 
      VALUES (?, ?, ?, ?)
    `);
    const result = stmt.run(userId, cleanOriginalUrl, finalShortCode, finalTitle);

    const fullShortUrl = `${config.baseUrl}/${finalShortCode}`;

    // Generate QR Code data URL
    const qrDataUrl = await QRCode.toDataURL(fullShortUrl, {
      margin: 2,
      width: 300,
      color: {
        dark: '#0f172a',
        light: '#ffffff'
      }
    });

    return res.status(201).json({
      id: result.lastInsertRowid,
      shortCode: finalShortCode,
      shortUrl: fullShortUrl,
      originalUrl: cleanOriginalUrl,
      title: finalTitle,
      clicks: 0,
      isActive: true,
      qrCode: qrDataUrl,
      createdAt: new Date().toISOString(),
      isGuest: !userId
    });
  } catch (err) {
    console.error('Shorten URL error:', err);
    return res.status(500).json({ error: 'Internal server error while shortening URL' });
  }
}

export function getUserUrls(req, res) {
  try {
    const userId = req.user.id;
    const { search, status } = req.query;

    let query = 'SELECT * FROM urls WHERE user_id = ?';
    const params = [userId];

    if (status === 'active') {
      query += ' AND is_active = 1';
    } else if (status === 'inactive') {
      query += ' AND is_active = 0';
    }

    if (search && search.trim()) {
      const searchPattern = `%${search.trim()}%`;
      query += ' AND (original_url LIKE ? OR short_code LIKE ? OR title LIKE ?)';
      params.push(searchPattern, searchPattern, searchPattern);
    }

    query += ' ORDER BY created_at DESC';

    const urls = db.prepare(query).all(...params);

    const formattedUrls = urls.map(u => ({
      id: u.id,
      shortCode: u.short_code,
      shortUrl: `${config.baseUrl}/${u.short_code}`,
      originalUrl: u.original_url,
      title: u.title,
      clicks: u.clicks,
      isActive: Boolean(u.is_active),
      createdAt: u.created_at,
      updatedAt: u.updated_at
    }));

    return res.json({ urls: formattedUrls });
  } catch (err) {
    console.error('Get user URLs error:', err);
    return res.status(500).json({ error: 'Failed to retrieve links' });
  }
}

import { parseUserAgent } from '../utils/uaParser.js';

export function getUrlStats(req, res) {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const url = db.prepare('SELECT * FROM urls WHERE id = ? AND user_id = ?').get(id, userId);
    if (!url) {
      return res.status(404).json({ error: 'Link not found' });
    }

    const clicks = db.prepare(`
      SELECT id, referrer, user_agent, ip_hash, created_at 
      FROM clicks 
      WHERE url_id = ? 
      ORDER BY created_at DESC 
      LIMIT 100
    `).all(id);

    // Calculate aggregated metrics
    const referrerCounts = {};
    const browserCounts = {};
    const osCounts = {};
    const deviceCounts = {};

    const formattedClicks = clicks.map(c => {
      const uaInfo = parseUserAgent(c.user_agent);
      const ref = c.referrer && c.referrer.trim() ? c.referrer.trim() : 'Direct';

      referrerCounts[ref] = (referrerCounts[ref] || 0) + 1;
      browserCounts[uaInfo.browser] = (browserCounts[uaInfo.browser] || 0) + 1;
      osCounts[uaInfo.os] = (osCounts[uaInfo.os] || 0) + 1;
      deviceCounts[uaInfo.device] = (deviceCounts[uaInfo.device] || 0) + 1;

      return {
        id: c.id,
        referrer: ref,
        userAgent: c.user_agent,
        browser: uaInfo.browser,
        os: uaInfo.os,
        device: uaInfo.device,
        icon: uaInfo.icon,
        summary: uaInfo.summary,
        ipHash: c.ip_hash,
        createdAt: c.created_at
      };
    });

    return res.json({
      url: {
        id: url.id,
        shortCode: url.short_code,
        shortUrl: `${config.baseUrl}/${url.short_code}`,
        originalUrl: url.original_url,
        title: url.title,
        clicks: url.clicks,
        isActive: Boolean(url.is_active),
        createdAt: url.created_at
      },
      summary: {
        totalClicks: url.clicks,
        topReferrers: referrerCounts,
        topBrowsers: browserCounts,
        topDevices: deviceCounts,
        topOS: osCounts
      },
      clickHistory: formattedClicks
    });
  } catch (err) {
    console.error('Get URL stats error:', err);
    return res.status(500).json({ error: 'Failed to retrieve link analytics' });
  }
}

export function updateUrl(req, res) {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { title, is_active, originalUrl } = req.body;

    const url = db.prepare('SELECT * FROM urls WHERE id = ? AND user_id = ?').get(id, userId);
    if (!url) {
      return res.status(404).json({ error: 'Link not found or unauthorized' });
    }

    let newOriginalUrl = url.original_url;
    if (originalUrl && originalUrl.trim() !== url.original_url) {
      const validation = normalizeAndValidateUrl(originalUrl, req.get('host'));
      if (!validation.isValid) {
        return res.status(400).json({ error: validation.error });
      }
      newOriginalUrl = validation.url;
    }

    const newTitle = title !== undefined ? title.trim() : url.title;
    const newIsActive = is_active !== undefined ? (is_active ? 1 : 0) : url.is_active;

    db.prepare(`
      UPDATE urls 
      SET original_url = ?, title = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ? AND user_id = ?
    `).run(newOriginalUrl, newTitle, newIsActive, id, userId);

    return res.json({
      message: 'Link updated successfully',
      url: {
        id: url.id,
        shortCode: url.short_code,
        shortUrl: `${config.baseUrl}/${url.short_code}`,
        originalUrl: newOriginalUrl,
        title: newTitle,
        isActive: Boolean(newIsActive),
        clicks: url.clicks,
        createdAt: url.created_at
      }
    });
  } catch (err) {
    console.error('Update URL error:', err);
    return res.status(500).json({ error: 'Failed to update link' });
  }
}

export function deleteUrl(req, res) {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const result = db.prepare('DELETE FROM urls WHERE id = ? AND user_id = ?').run(id, userId);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Link not found or unauthorized' });
    }

    return res.json({ message: 'Link deleted successfully' });
  } catch (err) {
    console.error('Delete URL error:', err);
    return res.status(500).json({ error: 'Failed to delete link' });
  }
}

export async function generateQr(req, res) {
  try {
    const { url } = req.query;
    if (!url) {
      return res.status(400).json({ error: 'URL parameter is required' });
    }

    const qrDataUrl = await QRCode.toDataURL(url, {
      margin: 2,
      width: 350,
      color: {
        dark: '#0f172a',
        light: '#ffffff'
      }
    });

    return res.json({ qrCode: qrDataUrl });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to generate QR code' });
  }
}
