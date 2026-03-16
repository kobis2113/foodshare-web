import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { User } from '../../models/User';
import { Post } from '../../models/Post';
import { combinedAuth } from '../../middleware/firebaseAuth';
import { AuthRequest } from '../../middleware/jwtAuth';
import { uploadImage } from '../../middleware/upload';

const router = Router();

/**
 * @swagger
 * /api/users/me:
 *   get:
 *     summary: Get current user profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *       - firebaseAuth: []
 *     responses:
 *       200:
 *         description: User profile
 */
router.get('/me', combinedAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get user stats
    const postsCount = await Post.countDocuments({ author: req.userId });
    const likesReceived = await Post.aggregate([
      { $match: { author: user._id } },
      { $group: { _id: null, total: { $sum: '$likesCount' } } }
    ]);

    res.json({
      id: user._id,
      email: user.email,
      displayName: user.displayName,
      profileImage: user.profileImage,
      stats: {
        posts: postsCount,
        likes: likesReceived[0]?.total || 0
      },
      createdAt: user.createdAt
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @swagger
 * /api/users/me:
 *   put:
 *     summary: Update current user profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *       - firebaseAuth: []
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               displayName:
 *                 type: string
 *               profileImage:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Profile updated
 */
router.put(
  '/me',
  combinedAuth,
  uploadImage.single('profileImage'),
  [body('displayName').optional().trim().isLength({ min: 2, max: 50 })],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const user = await User.findById(req.userId);

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      const { displayName } = req.body;

      if (displayName) user.displayName = displayName;
      if (req.file) user.profileImage = `/uploads/${req.file.filename}`;

      await user.save();

      res.json({
        message: 'Profile updated successfully',
        user: {
          id: user._id,
          email: user.email,
          displayName: user.displayName,
          profileImage: user.profileImage
        }
      });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

/**
 * @swagger
 * /api/users/me/posts:
 *   get:
 *     summary: Get current user's posts
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *       - firebaseAuth: []
 *     responses:
 *       200:
 *         description: User's posts
 */
router.get('/me/posts', combinedAuth, async (req: AuthRequest, res: Response) => {
  try {
    const posts = await Post.find({ author: req.userId })
      .sort({ createdAt: -1 })
      .populate('author', 'displayName profileImage')
      .lean();

    res.json({ posts });
  } catch (error) {
    console.error('Get user posts error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @swagger
 * /api/users/me/liked:
 *   get:
 *     summary: Get posts liked by current user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *       - firebaseAuth: []
 *     responses:
 *       200:
 *         description: Liked posts
 */
router.get('/me/liked', combinedAuth, async (req: AuthRequest, res: Response) => {
  try {
    const posts = await Post.find({ likes: req.userId })
      .sort({ createdAt: -1 })
      .populate('author', 'displayName profileImage')
      .lean();

    res.json({ posts });
  } catch (error) {
    console.error('Get liked posts error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Get user profile by ID
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User profile
 *       404:
 *         description: User not found
 */
router.get('/:id', combinedAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const postsCount = await Post.countDocuments({ author: req.params.id });

    res.json({
      id: user._id,
      displayName: user.displayName,
      profileImage: user.profileImage,
      stats: {
        posts: postsCount
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
