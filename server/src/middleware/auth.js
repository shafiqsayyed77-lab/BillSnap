/**
 * Authentication Middleware (auth.js)
 * -----------------------------------
 * Protects private API endpoints using JSON Web Tokens (JWT).
 * 
 * Beginner Concept:
 * When a user logs in, the server generates a cryptographically signed "token" containing
 * their user ID. The client sends this token in the 'Authorization: Bearer <token>' header
 * on every subsequent request.
 * 
 * This middleware:
 * 1. Checks for the token in the request header.
 * 2. Verifies the signature using JWT_SECRET.
 * 3. Attaches the user object to 'req.user' so controllers know who is making the request.
 * 4. Ensures strict data privacy: every query is scoped to 'req.user.id' so no user can
 *    ever access or modify another user's bills!
 */

import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const protect = async (req, res, next) => {
  let token;

  // Check if Authorization header exists and follows the 'Bearer <token>' convention
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // Extract token from 'Bearer <token>'
      token = req.headers.authorization.split(' ')[1];

      // Verify the token using the secret key
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'billsnap_super_secret_jwt_key_2026_change_in_production'
      );

      // Fetch user from DB (excluding passwordHash)
      const user = await User.findById(decoded.id).select('-passwordHash');

      if (!user) {
        return res.status(401).json({
          message: 'The user belonging to this token no longer exists.',
        });
      }

      // Attach user to req object for controllers to use
      req.user = user;
      next();
    } catch (err) {
      console.error('❌ [Auth Middleware] Token verification failed:', err.message);
      return res.status(401).json({
        message: 'Invalid or expired authentication token. Please log in again.',
      });
    }
  }

  if (!token) {
    return res.status(401).json({
      message: 'Access denied. No authorization token was provided.',
    });
  }
};
