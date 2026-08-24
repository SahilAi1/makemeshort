import express from 'express';
import { handleRedirect } from '../controllers/redirectController.js';

const router = express.Router();

// Match any slug except reserved static paths
router.get('/:shortCode', handleRedirect);

export default router;
