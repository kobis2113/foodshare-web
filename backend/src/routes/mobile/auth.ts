import { Router, Response, RequestHandler } from 'express';
import { User } from '../../models/User';
import { firebaseAuth } from '../../middleware/firebaseAuth';
import { AuthRequest, AuthRequestHandler } from '../../middleware/jwtAuth';

const router = Router();

/**
 * @swagger
 * /api/mobile/auth/sync:
 *   post:
 *     summary: Sync Firebase user with MongoDB (Mobile)
 *     tags: [Mobile Auth]
 *     security:
 *       - firebaseAuth: []
 *     description: |
 *       Called after Firebase authentication on mobile app.
 *       Creates or updates user in MongoDB and returns user data.
 *     responses:
 *       200:
 *         description: User synced successfully
 *       401:
 *         description: Invalid Firebase token
 */
router.post('/sync', firebaseAuth as RequestHandler, (async (req: AuthRequest, res: Response) => {
  try {
    // User is already created/updated by firebaseAuth middleware
    const user = req.user;

    if (!user) {
      res.status(401).json({ message: 'Authentication failed' });
      return;
    }

    res.json({
      message: 'User synced successfully',
      user: {
        id: user._id,
        email: user.email,
        displayName: user.displayName,
        profileImage: user.profileImage
      }
    });
  } catch (error) {
    console.error('Sync error:', error);
    res.status(500).json({ message: 'Server error' });
  }
}) as RequestHandler);

/**
 * @swagger
 * /api/mobile/auth/me:
 *   get:
 *     summary: Get current user (Mobile)
 *     tags: [Mobile Auth]
 *     security:
 *       - firebaseAuth: []
 *     responses:
 *       200:
 *         description: Current user data
 */
router.get('/me', firebaseAuth as RequestHandler, (async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.userId);

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    res.json({
      id: user._id,
      email: user.email,
      displayName: user.displayName,
      profileImage: user.profileImage
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
}) as RequestHandler);

export default router;
