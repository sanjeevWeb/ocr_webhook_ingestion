import express, { type Application, type Request, type Response } from 'express';
import dotenv from 'dotenv';
import docsRouter from './routes/docs.route.js';
import userRoute from './routes/user.route.js';
import tagRoute from './routes/tag.route.js';
import scopedActionRouter from './routes/scopedAction.route.js';
import ocrWebhookRouter from './routes/ocrWebhook.route.js';
import metricsRouter from './routes/auditLog.route.js';
import { connectDB } from './config/database.js';
// import multer from 'multer';

dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 5000;

connectDB();
app.use(express.json());
// app.use(multer())

app.get('/', (_req: Request, res: Response) => {
  res.send('API Running');
});

app.use(userRoute);
app.use('/api/v1/tag', tagRoute);
app.use(docsRouter);
app.use('/v1/actions',scopedActionRouter);
app.use('/v1/webhooks',ocrWebhookRouter);
app.use('/v1/metrics',metricsRouter);

// Only start the server if not in test mode
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Server started on port ${PORT}`);
  });
}

export default app;
