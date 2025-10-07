import { Schema, model, Document } from 'mongoose';

export interface IUser extends Document {
  email: string;
  role: 'admin' | 'support' | 'moderator' | 'user';
  credits: number;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true },
    role: {
      type: String,
      enum: ['admin', 'support', 'moderator', 'user'],
      default: 'user',
    },
    credits: {type: Number, default: 100 }
  },
  { timestamps: true },
);

export default model<IUser>('User', userSchema);
