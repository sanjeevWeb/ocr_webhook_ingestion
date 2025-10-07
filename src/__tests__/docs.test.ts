import request from 'supertest';
import mongoose from 'mongoose';
import app from '../index.js'; // Make sure app exports express instance properly
import jwt from 'jsonwebtoken';
import userModel from '../models/user.model.js';
import tagModel from '../models/tag.model.js';
import documentTagModel from '../models/documentTag.model.js';

describe('Docs API', () => {
  let token: string;
  let userId: string;
  let tagId: string;

  beforeAll(async () => {
    // Connect to test DB
    await mongoose.connect('mongodb://127.0.0.1:27017/docs_test');

    // Create test user
    const user = await userModel.create({
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123',
      role: 'user',
    });
    userId = (user._id as mongoose.Types.ObjectId).toString();

    // Create JWT token
    token = jwt.sign(
      { sub: userId, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '1h' },
    );

    // Create a primary tag owned by user
    const tag = await tagModel.create({ name: 'Invoices', ownerId: userId });
    tagId = (tag._id as mongoose.Types.ObjectId).toString();
  });

  afterAll(async () => {
    // Clean up database and close connection
    if (mongoose.connection && mongoose.connection.readyState === 1) {
      const db = mongoose.connection.db;
      // use db
    }
    await mongoose.connection.close();
  });

  it('should upload a document with primary tag', async () => {
    const res = await request(app)
      .post('/v1/docs')
      .set('Authorization', `Bearer ${token}`)
      .send({ filename: 'invoice.pdf', mime: 'application/pdf', primaryTag: tagId });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('doc');
    expect(res.body.doc).toHaveProperty('filename', 'invoice.pdf');

    // Additional check: confirm documentTag linking doc and tag is created
    const docId = res.body.doc._id;
    const docTag = await documentTagModel.findOne({
      documentId: docId,
      tagId: tagId,
      isPrimary: true,
    });
    expect(docTag).toBeDefined();
  });

  it('should reject document upload with invalid primary tag', async () => {
    const invalidTagId = new mongoose.Types.ObjectId().toString();

    const res = await request(app)
      .post('/v1/docs')
      .set('Authorization', `Bearer ${token}`)
      .send({ filename: 'test.pdf', mime: 'application/pdf', primaryTag: invalidTagId });

    expect(res.status).toBe(400);
  });
});
