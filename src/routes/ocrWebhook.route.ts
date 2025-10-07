// src/routes/index.ts
import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import ocrWebhookController from '../controllers/ocrWebhook.controller.js';

const router = Router();

// OCR Webhook
router.post('/ocr', authMiddleware, ocrWebhookController.ocrWebhookHandler);

export default router;
