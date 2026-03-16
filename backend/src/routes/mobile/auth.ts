import { Router, Response } from 'express';
import { User } from '../../models/User';
import { firebaseAuth } from '../../middleware/firebaseAuth';
import { AuthRequest } from '../../middleware/jwtAuth';

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
router.post('/sync', firebaseAuth, async (req: AuthRequest, res: Response) => {
  try {
    // User is already created/updated by firebaseAuth middleware
    const user = req.user;

    if (!user) {
      return res.status(401).json({ message: 'Authentication failed' });
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
});

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
router.get('/me', firebaseAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
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
});

export default router;
