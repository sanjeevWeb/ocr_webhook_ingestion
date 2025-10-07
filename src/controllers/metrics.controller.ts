// src/controllers/metrics.controller.ts
import type { Request, Response } from 'express';
import documentModel from '../models/document.model.js';

export const getMetrics = async (req: Request, res: Response) => {
  try {
    // 1. Count total documents
    const docs_total = await documentModel.countDocuments();

    // 2. Count total folders
    const folders_total = await FolderModel.countDocuments();

    // 3. Count actions in last 30 days
    const monthAgo = new Date();
    monthAgo.setDate(monthAgo.getDate() - 30);

    const actions_month = await AuditLog.countDocuments({ at: { $gte: monthAgo } });

    // 4. Count tasks created today (based on IST)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(todayStart.getDate() + 1);

    const tasks_today = await TaskModel.countDocuments({
      createdAt: { $gte: todayStart, $lt: tomorrowStart },
    });

    const metrics = {
      docs_total,
      folders_total,
      actions_month,
      tasks_today,
    };

    return res.status(200).json(metrics);
  } catch (error) {
    console.error('Metrics fetch error:', error);
    return res.status(500).json({ message: 'Failed to compute metrics' });
  }
};
