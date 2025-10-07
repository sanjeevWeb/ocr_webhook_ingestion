import type { Request, Response } from 'express';
import { Router } from 'express';
import jwt from 'jsonwebtoken';
import userModel from '../models/user.model.js';

const router = Router();

/**
 * @route POST /auth/login
 * @desc Login user and return access token
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, role } = req.body;

    // 1️ Input validation
    if (!email || !role) {
      return res.status(400).json({ message: 'Sub, Email and role are required' });
    }

    // 2️ Find user in DB
    const user = await userModel.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    //  Generate JWT (3 hours expiration)
    const token = jwt.sign(
      {
        sub: user._id,
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '3h' },
    );

    // 4️ Send response
    return res.status(200).json({
      message: 'Login successful',
      accessToken: token,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
      },
      expiresIn: '3h',
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
