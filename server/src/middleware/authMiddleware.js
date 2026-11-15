import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';

export const AUTH_COOKIE_NAME = 'codesync_token';

export async function requireAuth(req, res, next) {
  try {
    let token = req.cookies?.[AUTH_COOKIE_NAME];

    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ error: 'Authentication required. Please log in.' });
    }

    const secret = process.env.JWT_SECRET || 'super-secret-codesync-jwt-token-change-in-production';
    const decoded = jwt.verify(token, secret);

    const user = await User.findById(decoded.userId);
    if (!user) {
      res.clearCookie(AUTH_COOKIE_NAME);
      return res.status(401).json({ error: 'User session has expired or no longer exists.' });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError' || error.name === 'JsonWebTokenError') {
      res.clearCookie(AUTH_COOKIE_NAME);
      return res.status(401).json({ error: 'Session invalid or expired. Please log in again.' });
    }
    next(error);
  }
}
