import { Response, NextFunction } from 'express';
import admin from 'firebase-admin';
import { User } from '../models/User';
import { AuthRequest } from './jwtAuth';

// Initialize Firebase Admin SDK
const initializeFirebase = () => {
  if (admin.apps.length === 0) {
    // Check if we have the required environment variables
    if (process.env.FIREBASE_PROJECT_ID) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL
        })
      });
    } else {
      console.warn('Firebase Admin SDK not configured - mobile auth will not work');
    }
  }
};

// Initialize on module load
initializeFirebase();

/**
 * Firebase Authentication Middleware for Mobile App
 */
export const firebaseAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ message: 'No Firebase token provided' });
      return;
    }

    const token = authHeader.split(' ')[1];

    // Verify Firebase token
    const decodedToken = await admin.auth().verifyIdToken(token);

    // Find or create user in MongoDB based on Firebase UID
    let user = await User.findOne({ firebaseUid: decodedToken.uid });

    if (!user) {
      // Try to find by email (in case user registered on web first)
      user = await User.findOne({ email: decodedToken.email });

      if (user) {
        // Link Firebase UID to existing user
        user.firebaseUid = decodedToken.uid;
        await user.save();
      } else {
        // Create new user from Firebase data
        user = await User.create({
          email: decodedToken.email,
          displayName: decodedToken.name || decodedToken.email?.split('@')[0] || 'User',
          profileImage: decodedToken.picture || '',
          firebaseUid: decodedToken.uid
        });
      }
    }

    req.user = user;
    req.userId = user._id.toString();
    req.authType = 'firebase';

    next();
  } catch (error: any) {
    console.error('Firebase auth error:', error);

    if (error.code === 'auth/id-token-expired') {
      res.status(401).json({ message: 'Firebase token expired' });
      return;
    }
    if (error.code === 'auth/argument-error') {
      res.status(401).json({ message: 'Invalid Firebase token' });
      return;
    }

    res.status(401).json({ message: 'Firebase authentication failed' });
  }
};

/**
 * Combined auth middleware - accepts both JWT and Firebase tokens
 * Tries JWT first, then Firebase
 */
export const combinedAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;
  const authType = req.headers['x-auth-type'] as string;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ message: 'No token provided' });
    return;
  }

  // If auth type is explicitly specified
  if (authType === 'firebase') {
    return firebaseAuth(req, res, next);
  }

  // Try JWT first (for web)
  try {
    const { jwtAuth: jwtMiddleware } = await import('./jwtAuth');
    await new Promise<void>((resolve, reject) => {
      jwtMiddleware(req, res, (err: any) => {
        if (err) reject(err);
        else if (req.user) resolve();
        else reject(new Error('JWT auth failed'));
      });
    });
    return next();
  } catch {
    // JWT failed, try Firebase
    try {
      await new Promise<void>((resolve, reject) => {
        firebaseAuth(req, res, (err: any) => {
          if (err) reject(err);
          else if (req.user) resolve();
          else reject(new Error('Firebase auth failed'));
        });
      });
      return next();
    } catch {
      res.status(401).json({ message: 'Authentication failed' });
    }
  }
};
