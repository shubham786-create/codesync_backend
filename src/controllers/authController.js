import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { AUTH_COOKIE_NAME } from '../middleware/authMiddleware.js';

function isSecureContext(req) {
  if (process.env.NODE_ENV === 'production' || process.env.RENDER === 'true' || Boolean(process.env.RENDER_EXTERNAL_URL)) {
    return true;
  }
  if (req) {
    if (req.secure || req.headers?.['x-forwarded-proto'] === 'https') {
      return true;
    }
    const origin = req.headers?.origin || req.headers?.referer;
    if (origin && origin.startsWith('https://')) {
      return true;
    }
  }
  return false;
}

function setAuthCookie(res, token, req) {
  const isSecure = isSecureContext(req);
  res.cookie(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isSecure,
    sameSite: isSecure ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/',
  });
}

function generateToken(userId) {
  const secret = process.env.JWT_SECRET || 'super-secret-codesync-jwt-token-change-in-production';
  return jwt.sign({ userId }, secret, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

export async function register(req, res, next) {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
    });

    const token = generateToken(user._id.toString());
    setAuthCookie(res, token, req);

    return res.status(201).json({
      message: 'Account created successfully',
      user: user.toSafeObject(),
      token,
    });
  } catch (error) {
    next(error);
  }
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = generateToken(user._id.toString());
    setAuthCookie(res, token, req);

    return res.status(200).json({
      message: 'Logged in successfully',
      user: user.toSafeObject(),
      token,
    });
  } catch (error) {
    next(error);
  }
}

export async function logout(req, res) {
  const isSecure = isSecureContext(req);
  res.clearCookie(AUTH_COOKIE_NAME, {
    httpOnly: true,
    secure: isSecure,
    sameSite: isSecure ? 'none' : 'lax',
    path: '/',
  });
  return res.status(200).json({ message: 'Logged out successfully.' });
}

export async function getMe(req, res) {
  return res.status(200).json({
    user: req.user.toSafeObject(),
  });
}
