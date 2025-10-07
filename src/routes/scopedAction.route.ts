// src/routes/index.ts
import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { rbacMiddleware } from '../middlewares/rbac.middleware.js';
import scopedActionController from '../controllers/scopedAction.controller.js';

const router = Router();

// Scoped Actions
router.post(
  '/run',
  authMiddleware,
  rbacMiddleware(['user', 'admin']),
  scopedActionController.runScopedAction,
);
router.get('/usage/month', authMiddleware, scopedActionController.getMonthlyUsage);

export default router;
