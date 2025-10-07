import mongoose from 'mongoose';
import userModel from './models/user.model.js';

const MONGO_URI = 'mongodb://127.0.0.1:27017/docdb'; // replace with your DB name or connection string

const seedUsers = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log(' Connected to MongoDB');

    // Remove existing users (optional)
    await userModel.deleteMany({});
    console.log(' Cleared existing users');

    // Create seed users
    const users = [
      { email: 'admin@example.com', role: 'admin' },
      { email: 'support1@example.com', role: 'support' },
      { email: 'moderator1@example.com', role: 'moderator' },
      { email: 'user1@example.com', role: 'user' },
      { email: 'user2@example.com', role: 'user' },
    ];

    const created = await userModel.insertMany(users);
    console.log(` Inserted ${created.length} users`);
    created.forEach((u) => console.log(`- ${u.email} (${u.role})`));
  } catch (error) {
    console.error(' Error seeding users:', error);
  } finally {
    await mongoose.disconnect();
    console.log(' Disconnected from MongoDB');
  }
};

seedUsers();
