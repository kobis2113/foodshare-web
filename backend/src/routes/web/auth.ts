import { Router, Response, Request, RequestHandler } from 'express';
import { body, validationResult } from 'express-validator';
import passport from 'passport';
import { User } from '../../models/User';
import { AuthRequest, generateTokens, verifyRefreshToken, jwtAuth } from '../../middleware/jwtAuth';

import '../../config/passport';

const router = Router();
const jwtMiddleware = jwtAuth as RequestHandler;

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
  (async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { email, password, displayName } = req.body;

      const existingUser = await User.findOne({ email });
      if (existingUser) {
        res.status(400).json({ message: 'User already exists' });
        return;
      }

      const user = await User.create({
        email,
        password,
        displayName
      });

      const { accessToken, refreshToken } = generateTokens(
        user._id.toString(),
        user.email
      );

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
  }) as RequestHandler
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
  (async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { email, password } = req.body;

      const user = await User.findOne({ email }).select('+password +refreshTokens');

      if (!user || !user.password) {
        res.status(401).json({ message: 'Invalid credentials' });
        return;
      }

      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        res.status(401).json({ message: 'Invalid credentials' });
        return;
      }

      const { accessToken, refreshToken } = generateTokens(
        user._id.toString(),
        user.email
      );

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
  }) as RequestHandler
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
router.post('/refresh', (async (req: AuthRequest, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(401).json({ message: 'Refresh token required' });
      return;
    }

    const decoded = verifyRefreshToken(refreshToken);

    const user = await User.findById(decoded.userId).select('+refreshTokens');

    if (!user || !user.refreshTokens.includes(refreshToken)) {
      res.status(401).json({ message: 'Invalid refresh token' });
      return;
    }

    const tokens = generateTokens(user._id.toString(), user.email);

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
}) as RequestHandler);

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
router.post('/logout', jwtMiddleware, (async (req: AuthRequest, res: Response) => {
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
}) as RequestHandler);

/**
 * @swagger
 * /api/web/auth/google:
 *   get:
 *     summary: Initiate Google OAuth login
 *     tags: [Web Auth]
 *     description: Redirects user to Google for authentication
 *     responses:
 *       302:
 *         description: Redirect to Google OAuth
 */
router.get(
  '/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false
  })
);

/**
 * @swagger
 * /api/web/auth/google/callback:
 *   get:
 *     summary: Google OAuth callback
 *     tags: [Web Auth]
 *     description: Handles the callback from Google after authentication
 *     parameters:
 *       - in: query
 *         name: code
 *         schema:
 *           type: string
 *         description: OAuth authorization code from Google
 *     responses:
 *       302:
 *         description: Redirect to frontend with tokens
 *       401:
 *         description: Authentication failed
 */
router.get(
  '/google/callback',
  passport.authenticate('google', {
    session: false,
    failureRedirect: '/login?error=oauth_failed'
  }),
  (async (req: Request, res: Response) => {
    try {
      const user = req.user as any;

      if (!user) {
        res.redirect('/login?error=oauth_failed');
        return;
      }

      const { accessToken, refreshToken } = generateTokens(
        user._id.toString(),
        user.email
      );

      const userDoc = await User.findById(user._id).select('+refreshTokens');
      if (userDoc) {
        userDoc.refreshTokens.push(refreshToken);
        await userDoc.save();
      }

      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      res.redirect(
        `${frontendUrl}/auth/callback?accessToken=${accessToken}&refreshToken=${refreshToken}`
      );
    } catch (error) {
      console.error('Google callback error:', error);
      res.redirect('/login?error=server_error');
    }
  }) as RequestHandler
);

export default router;
