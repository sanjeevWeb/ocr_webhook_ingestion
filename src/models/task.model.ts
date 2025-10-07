// src/models/tag.model.ts
import { Schema, model, Document, Types } from 'mongoose';

export interface ITask extends Document {
  userId: Types.ObjectId;
  status: 'pending' | 'done' | 'failed';
  channel: string;
  target: string;
  source: string;
  classification: 'official' | 'ad';
  auditlogId?: Types.ObjectId;
  createdAt: Date;
}

const taskSchema = new Schema<ITask>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, required: true },
  channel: { type: String, required: true },
  target: { type: String, required: true },
  source: { type: String, required: true },
  classification: { type: String, required: true },
  auditlogId: { type: Schema.Types.ObjectId },
  createdAt: { type: Date, default: Date.now },
});

export default model<ITask>('Task', taskSchema);
