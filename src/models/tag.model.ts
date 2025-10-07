// src/models/tag.model.ts
import { Schema, model, Document, Types } from 'mongoose';

export interface ITag extends Document {
  name: string;
  ownerId: Types.ObjectId;
  isPrimary: boolean;
  createdAt: Date;
}

const tagSchema = new Schema<ITag>({
  name: { type: String, required: true },
  ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  isPrimary: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

export default model<ITag>('Tag', tagSchema);
