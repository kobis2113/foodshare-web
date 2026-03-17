import { Router, Response, RequestHandler } from 'express';
import { body, query, validationResult } from 'express-validator';
import { combinedAuth } from '../../middleware/firebaseAuth';
import { AuthRequest } from '../../middleware/jwtAuth';
import { Post } from '../../models/Post';

const router = Router();
const authMiddleware = combinedAuth as RequestHandler;

// AI-specific rate limiting (stricter than general API)
const aiRequestCounts = new Map<string, { count: number; resetTime: number }>();
const AI_RATE_LIMIT = 20; // 20 AI requests per minute
const AI_RATE_WINDOW = 60 * 1000; // 1 minute

const checkAIRateLimit = (userId: string): boolean => {
  const now = Date.now();
  const userLimit = aiRequestCounts.get(userId);

  if (!userLimit || now > userLimit.resetTime) {
    aiRequestCounts.set(userId, { count: 1, resetTime: now + AI_RATE_WINDOW });
    return true;
  }

  if (userLimit.count >= AI_RATE_LIMIT) {
    return false;
  }

  userLimit.count++;
  return true;
};

// Clean up old entries every minute
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of aiRequestCounts.entries()) {
    if (value.resetTime < now) {
      aiRequestCounts.delete(key);
    }
  }
}, 60000);

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
  error?: {
    message?: string;
    code?: number;
  };
}

async function callGeminiAPI(prompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1024
        }
      })
    }
  );

  if (!response.ok) {
    const errorData = await response.json() as GeminiResponse;
    const errorMessage = errorData.error?.message || 'Gemini API request failed';
    throw new Error(errorMessage);
  }

  const data = await response.json() as GeminiResponse;
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error('No response from Gemini API');
  }

  return text;
}

/**
 * @swagger
 * /api/ai/analyze:
 *   post:
 *     summary: Analyze meal with AI
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *       - firebaseAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - mealName
 *             properties:
 *               mealName:
 *                 type: string
 *               description:
 *                 type: string
 *               nutrition:
 *                 type: object
 *     responses:
 *       200:
 *         description: AI analysis result
 */
router.post(
  '/analyze',
  authMiddleware,
  [
    body('mealName').trim().isLength({ min: 1, max: 200 }),
    body('description').optional().trim().isLength({ max: 500 })
  ],
  (async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { mealName, description, nutrition } = req.body;

      const prompt = `Analyze this meal for health and nutrition:
Meal: ${mealName}
${description ? `Description: ${description}` : ''}
${nutrition ? `Nutrition data: Calories: ${nutrition.calories}, Protein: ${nutrition.protein}g, Carbs: ${nutrition.carbs}g, Fat: ${nutrition.fat}g` : ''}

Provide a brief analysis (2-3 sentences) covering:
1. Health benefits or concerns
2. Nutritional balance
3. One improvement suggestion

Keep it concise and friendly.`;

      const analysis = await callGeminiAPI(prompt);
      res.json({ analysis, source: 'gemini' });
    } catch (error: any) {
      console.error('AI analyze error:', error.message);
      res.status(503).json({
        message: 'AI service unavailable',
        error: error.message
      });
    }
  }) as RequestHandler
);

/**
 * @swagger
 * /api/ai/suggest:
 *   post:
 *     summary: Get meal suggestions based on preferences
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *       - firebaseAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               preferences:
 *                 type: string
 *               dietaryRestrictions:
 *                 type: array
 *                 items:
 *                   type: string
 *               calories:
 *                 type: number
 *     responses:
 *       200:
 *         description: Meal suggestions
 */
router.post(
  '/suggest',
  authMiddleware,
  [
    body('preferences').optional().trim().isLength({ max: 200 }),
    body('dietaryRestrictions').optional().isArray(),
    body('calories').optional().isInt({ min: 100, max: 3000 })
  ],
  (async (req: AuthRequest, res: Response) => {
    try {
      const { preferences, dietaryRestrictions, calories } = req.body;

      const restrictions = dietaryRestrictions?.length
        ? `Dietary restrictions: ${dietaryRestrictions.join(', ')}`
        : '';

      const prompt = `Suggest 3 healthy meal ideas.
${preferences ? `Preferences: ${preferences}` : ''}
${restrictions}
${calories ? `Target calories: around ${calories}` : ''}

Format as a JSON array with objects containing: name, description, estimatedCalories
Example: [{"name": "Grilled Chicken Salad", "description": "Fresh greens with grilled chicken", "estimatedCalories": 350}]
Return only the JSON array.`;

      const response = await callGeminiAPI(prompt);

      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('Invalid response format from AI');
      }

      const suggestions = JSON.parse(jsonMatch[0]);
      res.json({ suggestions, source: 'gemini' });
    } catch (error: any) {
      console.error('AI suggest error:', error.message);
      res.status(503).json({
        message: 'AI service unavailable',
        error: error.message
      });
    }
  }) as RequestHandler
);

/**
 * @swagger
 * /api/ai/tips:
 *   post:
 *     summary: Get health tips for a meal
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *       - firebaseAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - mealName
 *             properties:
 *               mealName:
 *                 type: string
 *               nutrition:
 *                 type: object
 *     responses:
 *       200:
 *         description: Health tips
 */
router.post(
  '/tips',
  authMiddleware,
  [body('mealName').trim().isLength({ min: 1, max: 200 })],
  (async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { mealName, nutrition } = req.body;

      const prompt = `Give 3 brief health tips for someone eating: ${mealName}
${nutrition ? `Nutrition: ${nutrition.calories} cal, ${nutrition.protein}g protein, ${nutrition.carbs}g carbs, ${nutrition.fat}g fat` : ''}

Format as JSON array of strings.
Example: ["Pair with vegetables for more fiber", "Great protein source for muscle recovery"]
Return only the JSON array.`;

      const response = await callGeminiAPI(prompt);

      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('Invalid response format from AI');
      }

      const tips = JSON.parse(jsonMatch[0]);
      res.json({ tips, source: 'gemini' });
    } catch (error: any) {
      console.error('AI tips error:', error.message);
      res.status(503).json({
        message: 'AI service unavailable',
        error: error.message
      });
    }
  }) as RequestHandler
);

/**
 * @swagger
 * /api/ai/smart-search:
 *   get:
 *     summary: AI-powered natural language search for posts
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *       - firebaseAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Natural language search query (e.g., "healthy breakfast with protein")
 *     responses:
 *       200:
 *         description: AI-analyzed search results with explanations
 */
router.get(
  '/smart-search',
  authMiddleware,
  [query('q').trim().isLength({ min: 2, max: 200 })],
  (async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      // Check AI rate limit
      if (!checkAIRateLimit(req.userId!)) {
        res.status(429).json({
          message: 'AI rate limit exceeded. Please wait a moment before trying again.',
          retryAfter: 60
        });
        return;
      }

      const userQuery = req.query.q as string;

      const interpretPrompt = `You are a food search assistant. Analyze this search query and extract search criteria.
Query: "${userQuery}"

Respond in JSON format only:
{
  "keywords": ["keyword1", "keyword2"],
  "nutritionFilters": {
    "highProtein": true/false,
    "lowCalorie": true/false,
    "lowCarb": true/false,
    "lowFat": true/false
  },
  "mealType": "breakfast/lunch/dinner/snack/any",
  "healthFocus": "description of what user is looking for",
  "searchExplanation": "brief explanation of how you interpreted the query"
}

Return ONLY the JSON object, no other text.`;

      const interpretResponse = await callGeminiAPI(interpretPrompt);

      // Parse AI interpretation
      let searchCriteria;
      try {
        const jsonMatch = interpretResponse.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('Invalid format');
        searchCriteria = JSON.parse(jsonMatch[0]);
      } catch {
        // Fallback to basic text search if AI parsing fails
        searchCriteria = {
          keywords: userQuery.split(' ').filter(w => w.length > 2),
          nutritionFilters: {},
          mealType: 'any',
          healthFocus: userQuery,
          searchExplanation: 'Using basic keyword search'
        };
      }

      const mongoQuery: any = {};

      // Text search with keywords
      if (searchCriteria.keywords && searchCriteria.keywords.length > 0) {
        mongoQuery.$text = { $search: searchCriteria.keywords.join(' ') };
      }

      // Nutrition filters
      if (searchCriteria.nutritionFilters) {
        if (searchCriteria.nutritionFilters.highProtein) {
          mongoQuery['nutrition.protein'] = { $gte: 20 };
        }
        if (searchCriteria.nutritionFilters.lowCalorie) {
          mongoQuery['nutrition.calories'] = { $lte: 400 };
        }
        if (searchCriteria.nutritionFilters.lowCarb) {
          mongoQuery['nutrition.carbs'] = { $lte: 30 };
        }
        if (searchCriteria.nutritionFilters.lowFat) {
          mongoQuery['nutrition.fat'] = { $lte: 15 };
        }
      }

      let posts;
      if (Object.keys(mongoQuery).length > 0) {
        posts = await Post.find(mongoQuery)
          .sort({ createdAt: -1 })
          .limit(20)
          .populate('author', 'displayName profileImage')
          .lean();
      } else {
        // Fallback: get recent posts if no specific criteria
        posts = await Post.find()
          .sort({ createdAt: -1 })
          .limit(20)
          .populate('author', 'displayName profileImage')
          .lean();
      }

      // Add isLiked field
      const postsWithLikeStatus = posts.map(post => ({
        ...post,
        isLiked: post.likes.some((likeId: any) => likeId.toString() === req.userId)
      }));

      let aiInsights = null;
      if (postsWithLikeStatus.length > 0) {
        const postSummaries = postsWithLikeStatus.slice(0, 5).map(p => ({
          name: p.mealName,
          description: p.description || '',
          nutrition: p.nutrition
        }));

        const insightsPrompt = `Based on the search "${userQuery}", here are the top meals found:
${JSON.stringify(postSummaries, null, 2)}

Provide a brief helpful response (2-3 sentences) explaining how these results match the search and any nutrition insights. Be concise and friendly.`;

        try {
          aiInsights = await callGeminiAPI(insightsPrompt);
        } catch {
          aiInsights = null;
        }
      }

      res.json({
        posts: postsWithLikeStatus,
        searchCriteria,
        aiInsights,
        totalResults: postsWithLikeStatus.length,
        source: 'gemini'
      });

    } catch (error: any) {
      console.error('AI smart search error:', error.message);

      // Fallback to basic search on AI failure
      try {
        const userQuery = req.query.q as string;
        const posts = await Post.find(
          { $text: { $search: userQuery } },
          { score: { $meta: 'textScore' } }
        )
          .sort({ score: { $meta: 'textScore' } })
          .limit(20)
          .populate('author', 'displayName profileImage')
          .lean();

        const postsWithLikeStatus = posts.map(post => ({
          ...post,
          isLiked: post.likes.some((likeId: any) => likeId.toString() === req.userId)
        }));

        res.json({
          posts: postsWithLikeStatus,
          searchCriteria: { keywords: [userQuery], fallback: true },
          aiInsights: null,
          totalResults: postsWithLikeStatus.length,
          source: 'fallback'
        });
      } catch (fallbackError) {
        res.status(503).json({
          message: 'Search service unavailable',
          error: error.message
        });
      }
    }
  }) as RequestHandler
);

export default router;
