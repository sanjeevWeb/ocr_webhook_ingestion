import express from 'express';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import auditLogController from '../controllers/auditLog.controller.js';

const router = express.Router();

router.get('/',authMiddleware , auditLogController.getMetrics);

export default router;