import { UserPayload } from '../middlewares/auth.middleware';

declare global {
  namespace Express {
    interface Request {
      user?: UserPayload;
      savedFile: string;
    }
  }
}
