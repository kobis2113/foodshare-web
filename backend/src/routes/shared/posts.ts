import { Router, Response, RequestHandler } from 'express';
import { body, query, validationResult } from 'express-validator';
import { Post } from '../../models/Post';
import { Comment } from '../../models/Comment';
import { combinedAuth } from '../../middleware/firebaseAuth';
import { AuthRequest } from '../../middleware/jwtAuth';
import { uploadImage } from '../../middleware/upload';
import { PAGINATION, VALIDATION } from '../../constants';

const router = Router();

// Type helper to avoid repetitive casting
const authMiddleware = combinedAuth as RequestHandler;

/**
 * @swagger
 * /api/posts:
 *   get:
 *     summary: Get all posts (paginated, infinite scroll)
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *       - firebaseAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: List of posts
 */
router.get(
  '/',
  authMiddleware,
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 50 })
  ],
  (async (req: AuthRequest, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || PAGINATION.DEFAULT_LIMIT;
      const skip = (page - 1) * limit;

      const posts = await Post.find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('author', '_id displayName profileImage')
        .lean();

      // Add isLiked field for current user
      const postsWithLikeStatus = posts.map(post => ({
        ...post,
        isLiked: post.likes.some(
          (likeId: any) => likeId.toString() === req.userId
        )
      }));

      const total = await Post.countDocuments();

      res.json({
        posts: postsWithLikeStatus,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
          hasMore: page * limit < total
        }
      });
    } catch (error) {
      console.error('Get posts error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }) as RequestHandler
);

/**
 * @swagger
 * /api/posts/search:
 *   get:
 *     summary: Search posts by meal name or description
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *       - firebaseAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Search query
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Search results
 */
router.get('/search', authMiddleware, (async (req: AuthRequest, res: Response) => {
  try {
    const searchQuery = req.query.q as string;

    if (!searchQuery || searchQuery.trim().length === 0) {
      res.status(400).json({ message: 'Search query required' });
      return;
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || PAGINATION.DEFAULT_LIMIT;
    const skip = (page - 1) * limit;

    const posts = await Post.find(
      { $text: { $search: searchQuery } },
      { score: { $meta: 'textScore' } }
    )
      .sort({ score: { $meta: 'textScore' }, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('author', '_id displayName profileImage')
      .lean();

    const postsWithLikeStatus = posts.map(post => ({
      ...post,
      isLiked: post.likes.some(
        (likeId: any) => likeId.toString() === req.userId
      )
    }));

    const total = await Post.countDocuments({ $text: { $search: searchQuery } });

    res.json({
      posts: postsWithLikeStatus,
      query: searchQuery,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasMore: page * limit < total
      }
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ message: 'Server error' });
  }
}) as RequestHandler);

/**
 * @swagger
 * /api/posts/{id}:
 *   get:
 *     summary: Get post by ID
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *       - firebaseAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Post details
 *       404:
 *         description: Post not found
 */
router.get('/:id', authMiddleware, (async (req: AuthRequest, res: Response) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate('author', '_id displayName profileImage')
      .lean();

    if (!post) {
      res.status(404).json({ message: 'Post not found' });
      return;
    }

    res.json({
      ...post,
      isLiked: post.likes.some(
        (likeId: any) => likeId.toString() === req.userId
      )
    });
  } catch (error) {
    console.error('Get post error:', error);
    res.status(500).json({ message: 'Server error' });
  }
}) as RequestHandler);

/**
 * @swagger
 * /api/posts:
 *   post:
 *     summary: Create a new post
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *       - firebaseAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - mealName
 *               - image
 *             properties:
 *               mealName:
 *                 type: string
 *               description:
 *                 type: string
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Post created
 */
router.post(
  '/',
  authMiddleware,
  uploadImage.single('image'),
  [
    body('mealName').trim().isLength({ min: VALIDATION.MEAL_NAME.MIN_LENGTH, max: VALIDATION.MEAL_NAME.MAX_LENGTH }),
    body('description').optional().trim().isLength({ max: VALIDATION.DESCRIPTION.MAX_LENGTH })
  ],
  (async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      if (!req.file) {
        res.status(400).json({ message: 'Image is required' });
        return;
      }

      const { mealName, description, nutrition } = req.body;

      const post = await Post.create({
        author: req.userId,
        mealName,
        description,
        image: `/uploads/${req.file.filename}`,
        nutrition: nutrition ? JSON.parse(nutrition) : undefined
      });

      await post.populate('author', '_id displayName profileImage');

      res.status(201).json({
        message: 'Post created successfully',
        post
      });
    } catch (error) {
      console.error('Create post error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }) as RequestHandler
);

/**
 * @swagger
 * /api/posts/{id}:
 *   put:
 *     summary: Update a post (owner only)
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *       - firebaseAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Post updated
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Post not found
 */
router.put(
  '/:id',
  authMiddleware,
  uploadImage.single('image'),
  (async (req: AuthRequest, res: Response) => {
    try {
      const post = await Post.findById(req.params.id);

      if (!post) {
        res.status(404).json({ message: 'Post not found' });
        return;
      }

      if (post.author.toString() !== req.userId) {
        res.status(403).json({ message: 'Not authorized' });
        return;
      }

      const { mealName, description, nutrition } = req.body;

      if (mealName) post.mealName = mealName;
      if (description !== undefined) post.description = description;
      if (req.file) post.image = `/uploads/${req.file.filename}`;
      if (nutrition) post.nutrition = JSON.parse(nutrition);

      await post.save();
      await post.populate('author', '_id displayName profileImage');

      res.json({
        message: 'Post updated successfully',
        post
      });
    } catch (error) {
      console.error('Update post error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }) as RequestHandler
);

/**
 * @swagger
 * /api/posts/{id}:
 *   delete:
 *     summary: Delete a post (owner only)
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *       - firebaseAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Post deleted
 */
router.delete('/:id', authMiddleware, (async (req: AuthRequest, res: Response) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      res.status(404).json({ message: 'Post not found' });
      return;
    }

    if (post.author.toString() !== req.userId) {
      res.status(403).json({ message: 'Not authorized' });
      return;
    }

    // Delete associated comments
    await Comment.deleteMany({ post: post._id });

    await post.deleteOne();

    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    console.error('Delete post error:', error);
    res.status(500).json({ message: 'Server error' });
  }
}) as RequestHandler);

/**
 * @swagger
 * /api/posts/{id}/like:
 *   post:
 *     summary: Like/unlike a post
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *       - firebaseAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Like toggled
 */
/**
 * @swagger
 * /api/posts/{id}/likes:
 *   get:
 *     summary: Get users who liked a post
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *       - firebaseAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of users who liked the post
 */
router.get('/:id/likes', authMiddleware, (async (req: AuthRequest, res: Response) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate('likes', 'displayName profileImage')
      .lean();

    if (!post) {
      res.status(404).json({ message: 'Post not found' });
      return;
    }

    res.json({ users: post.likes });
  } catch (error) {
    console.error('Get likes error:', error);
    res.status(500).json({ message: 'Server error' });
  }
}) as RequestHandler);

router.post('/:id/like', authMiddleware, (async (req: AuthRequest, res: Response) => {
  try {
    const postId = req.params.id;
    const userId = req.userId!;

    // Check if user already liked the post (efficient indexed query)
    const existingLike = await Post.findOne({
      _id: postId,
      likes: userId
    }).select('_id').lean();

    let updatedPost;

    if (existingLike) {
      // Unlike: Use atomic $pull and $inc operations
      updatedPost = await Post.findByIdAndUpdate(
        postId,
        {
          $pull: { likes: userId },
          $inc: { likesCount: -1 }
        },
        { new: true }
      ).select('likesCount').lean();
    } else {
      // Like: Use atomic $addToSet and $inc operations
      updatedPost = await Post.findByIdAndUpdate(
        postId,
        {
          $addToSet: { likes: userId },
          $inc: { likesCount: 1 }
        },
        { new: true }
      ).select('likesCount').lean();
    }

    if (!updatedPost) {
      res.status(404).json({ message: 'Post not found' });
      return;
    }

    // Ensure likesCount doesn't go negative
    if (updatedPost.likesCount < 0) {
      await Post.findByIdAndUpdate(postId, { likesCount: 0 });
      updatedPost.likesCount = 0;
    }

    res.json({
      isLiked: !existingLike,
      likesCount: updatedPost.likesCount
    });
  } catch (error) {
    console.error('Like post error:', error);
    res.status(500).json({ message: 'Server error' });
  }
}) as RequestHandler);

/**
 * @swagger
 * /api/posts/{id}/comments:
 *   get:
 *     summary: Get comments for a post
 *     tags: [Posts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of comments
 */
router.get('/:id/comments', authMiddleware, (async (req: AuthRequest, res: Response) => {
  try {
    const comments = await Comment.find({ post: req.params.id })
      .sort({ createdAt: -1 })
      .populate('author', '_id displayName profileImage')
      .lean();

    res.json({ comments });
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({ message: 'Server error' });
  }
}) as RequestHandler);

/**
 * @swagger
 * /api/posts/{id}/comments:
 *   post:
 *     summary: Add a comment to a post
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *       - firebaseAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - text
 *             properties:
 *               text:
 *                 type: string
 *     responses:
 *       201:
 *         description: Comment added
 */
router.post(
  '/:id/comments',
  authMiddleware,
  [body('text').trim().isLength({ min: VALIDATION.COMMENT.MIN_LENGTH, max: VALIDATION.COMMENT.MAX_LENGTH })],
  (async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const post = await Post.findById(req.params.id);
      if (!post) {
        res.status(404).json({ message: 'Post not found' });
        return;
      }

      const comment = await Comment.create({
        post: req.params.id,
        author: req.userId,
        text: req.body.text
      });

      post.commentsCount += 1;
      await post.save();

      await comment.populate('author', '_id displayName profileImage');

      res.status(201).json({
        message: 'Comment added successfully',
        comment
      });
    } catch (error) {
      console.error('Add comment error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }) as RequestHandler
);

/**
 * @swagger
 * /api/posts/{postId}/comments/{commentId}:
 *   put:
 *     summary: Update a comment (owner only)
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *       - firebaseAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: commentId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - text
 *             properties:
 *               text:
 *                 type: string
 *     responses:
 *       200:
 *         description: Comment updated
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Comment not found
 */
router.put(
  '/:postId/comments/:commentId',
  authMiddleware,
  [body('text').trim().isLength({ min: VALIDATION.COMMENT.MIN_LENGTH, max: VALIDATION.COMMENT.MAX_LENGTH })],
  (async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const comment = await Comment.findById(req.params.commentId);

      if (!comment) {
        res.status(404).json({ message: 'Comment not found' });
        return;
      }

      if (comment.author.toString() !== req.userId) {
        res.status(403).json({ message: 'Not authorized' });
        return;
      }

      comment.text = req.body.text;
      await comment.save();
      await comment.populate('author', '_id displayName profileImage');

      res.json({
        message: 'Comment updated successfully',
        comment
      });
    } catch (error) {
      console.error('Update comment error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }) as RequestHandler
);

/**
 * @swagger
 * /api/posts/{postId}/comments/{commentId}:
 *   delete:
 *     summary: Delete a comment (owner only)
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *       - firebaseAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: commentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Comment deleted
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Comment not found
 */
router.delete('/:postId/comments/:commentId', authMiddleware, (async (req: AuthRequest, res: Response) => {
  try {
    const comment = await Comment.findById(req.params.commentId);

    if (!comment) {
      res.status(404).json({ message: 'Comment not found' });
      return;
    }

    if (comment.author.toString() !== req.userId) {
      res.status(403).json({ message: 'Not authorized' });
      return;
    }

    const post = await Post.findById(req.params.postId);
    if (post) {
      post.commentsCount = Math.max(0, post.commentsCount - 1);
      await post.save();
    }

    await comment.deleteOne();

    res.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('Delete comment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
}) as RequestHandler);

export default router;
