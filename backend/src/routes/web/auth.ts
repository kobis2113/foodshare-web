import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { User } from '../../models/User';
import { AuthRequest, generateTokens, verifyRefreshToken, jwtAuth } from '../../middleware/jwtAuth';

const router = Router();

/**
 * @swagger
 * /api/web/auth/register:
 *   post:
 *     summary: Register a new user (Web)
 *     tags: [Web Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - displayName
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 6
 *               displayName:
 *                 type: string
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Validation error or user exists
 */
router.post(
  '/register',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
    body('displayName').trim().isLength({ min: 2, max: 50 })
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password, displayName } = req.body;

      // Check if user exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ message: 'User already exists' });
      }

      // Create user
      const user = await User.create({
        email,
        password,
        displayName
      });

      // Generate tokens
      const { accessToken, refreshToken } = generateTokens(
        user._id.toString(),
        user.email
      );

      // Save refresh token
      user.refreshTokens = [refreshToken];
      await user.save();

      res.status(201).json({
        message: 'User registered successfully',
        user: {
          id: user._id,
          email: user.email,
          displayName: user.displayName,
          profileImage: user.profileImage
        },
        accessToken,
        refreshToken
      });
    } catch (error) {
      console.error('Register error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

/**
 * @swagger
 * /api/web/auth/login:
 *   post:
 *     summary: Login user (Web)
 *     tags: [Web Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 */
router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty()
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password } = req.body;

      // Find user with password
      const user = await User.findOne({ email }).select('+password +refreshTokens');

      if (!user || !user.password) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      // Check password
      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      // Generate tokens
      const { accessToken, refreshToken } = generateTokens(
        user._id.toString(),
        user.email
      );

      // Save refresh token
      user.refreshTokens.push(refreshToken);
      await user.save();

      res.json({
        message: 'Login successful',
        user: {
          id: user._id,
          email: user.email,
          displayName: user.displayName,
          profileImage: user.profileImage
        },
        accessToken,
        refreshToken
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

/**
 * @swagger
 * /api/web/auth/refresh:
 *   post:
 *     summary: Refresh access token
 *     tags: [Web Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: New tokens generated
 *       401:
 *         description: Invalid refresh token
 */
router.post('/refresh', async (req: AuthRequest, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({ message: 'Refresh token required' });
    }

    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);

    // Find user and check if token exists
    const user = await User.findById(decoded.userId).select('+refreshTokens');

    if (!user || !user.refreshTokens.includes(refreshToken)) {
      return res.status(401).json({ message: 'Invalid refresh token' });
    }

    // Generate new tokens
    const tokens = generateTokens(user._id.toString(), user.email);

    // Replace old refresh token with new one
    user.refreshTokens = user.refreshTokens.filter(t => t !== refreshToken);
    user.refreshTokens.push(tokens.refreshToken);
    await user.save();

    res.json({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken
    });
  } catch (error) {
    console.error('Refresh error:', error);
    res.status(401).json({ message: 'Invalid refresh token' });
  }
});

/**
 * @swagger
 * /api/web/auth/logout:
 *   post:
 *     summary: Logout user
 *     tags: [Web Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logged out successfully
 */
router.post('/logout', jwtAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { refreshToken } = req.body;

    const user = await User.findById(req.userId).select('+refreshTokens');

    if (user && refreshToken) {
      user.refreshTokens = user.refreshTokens.filter(t => t !== refreshToken);
      await user.save();
    }

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
