import { Router, Response, RequestHandler } from 'express';
import { body, validationResult } from 'express-validator';
import { combinedAuth } from '../../middleware/firebaseAuth';
import { AuthRequest } from '../../middleware/jwtAuth';

const router = Router();
const authMiddleware = combinedAuth as RequestHandler;

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

export default router;
