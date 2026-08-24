import express from 'express';
import { 
  shortenUrl, 
  getUserUrls, 
  getUrlStats, 
  updateUrl, 
  deleteUrl, 
  generateQr 
} from '../controllers/urlController.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';

const router = express.Router();

// Shorten route: works for both guest and authenticated users
router.post('/shorten', optionalAuth, shortenUrl);

// QR Code generator helper
router.get('/qr', generateQr);

// Authenticated user links management
router.get('/', requireAuth, getUserUrls);
router.get('/:id/stats', requireAuth, getUrlStats);
router.patch('/:id', requireAuth, updateUrl);
router.delete('/:id', requireAuth, deleteUrl);

export default router;
