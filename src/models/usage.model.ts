// src/models/tag.model.ts
import { Schema, model, Document, Types } from 'mongoose';

export interface IUsage extends Document {
  userId: Types.ObjectId;
  action: 'make_document' | 'make_csv';
  creditsUsed: number;
  createdAt: Date;
}

const usageSchema = new Schema<IUsage>({
  userId: { type: Schema.Types.ObjectId, required: true },
  action: { type: String, enum: ['make_document', 'make_csv'], required: true },
  creditsUsed: { type: Number, required: true, default: 100 },
  createdAt: { type: Date, default: Date.now },
});

export default model<IUsage>('Usage', usageSchema);
