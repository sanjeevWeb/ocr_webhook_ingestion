import type { Request, Response } from 'express';
import documentModel from '../models/document.model.js';
import tagModel from '../models/tag.model.js';
import usageModel from '../models/usage.model.js';
import auditLogModel from '../models/auditLog.model.js';

async function getMetrics(req: Request, res: Response) {
  try {
    const now = new Date();
    // Calculate start of today
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Total documents in the system
    const docsTotal = await documentModel.countDocuments();

    // Total tags/folders in the system
    const foldersTotal = await tagModel.countDocuments();

    // Total scoped actions this month (using usage collection tracking actions)
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const actionsMonth = await usageModel.countDocuments({
      createdAt: { $gte: startOfMonth, $lte: now },
      action: { $exists:true},
    });

    // Total tasks created today according to audit logs with action=create_task and at >= startOfToday
    const tasksToday = await auditLogModel.countDocuments({
      action: 'webhook_ingest',
      at: { $gte: startOfToday, $lte: now },
    });

    return res.status(200).json({
      docs_total: docsTotal,
      folders_total: foldersTotal,
      actions_month: actionsMonth,
      tasks_today: tasksToday,
    });
  } catch (err) {
    console.error('Error fetching metrics:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

export default {
  getMetrics,
};
