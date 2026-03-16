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
}

async function callGeminiAPI(prompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return '';
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
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
    throw new Error('Gemini API request failed');
  }

  const data = await response.json() as GeminiResponse;
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
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

      if (!analysis) {
        res.json({
          analysis: generateMockAnalysis(mealName, nutrition),
          source: 'mock'
        });
        return;
      }

      res.json({ analysis, source: 'gemini' });
    } catch (error) {
      console.error('AI analyze error:', error);
      res.status(500).json({ message: 'AI analysis failed' });
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

      if (!response) {
        res.json({
          suggestions: generateMockSuggestions(preferences),
          source: 'mock'
        });
        return;
      }

      try {
        const jsonMatch = response.match(/\[[\s\S]*\]/);
        const suggestions = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
        res.json({ suggestions, source: 'gemini' });
      } catch {
        res.json({
          suggestions: generateMockSuggestions(preferences),
          source: 'mock'
        });
      }
    } catch (error) {
      console.error('AI suggest error:', error);
      res.status(500).json({ message: 'AI suggestion failed' });
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

      if (!response) {
        res.json({
          tips: generateMockTips(mealName, nutrition),
          source: 'mock'
        });
        return;
      }

      try {
        const jsonMatch = response.match(/\[[\s\S]*\]/);
        const tips = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
        res.json({ tips, source: 'gemini' });
      } catch {
        res.json({
          tips: generateMockTips(mealName, nutrition),
          source: 'mock'
        });
      }
    } catch (error) {
      console.error('AI tips error:', error);
      res.status(500).json({ message: 'AI tips failed' });
    }
  }) as RequestHandler
);

function generateMockAnalysis(mealName: string, nutrition?: any): string {
  const analyses = [
    `${mealName} is a balanced meal choice. ${nutrition?.protein > 20 ? 'Great protein content for muscle maintenance.' : 'Consider adding more protein.'} Stay hydrated while enjoying!`,
    `This ${mealName} provides essential nutrients. ${nutrition?.calories < 500 ? 'A lighter option perfect for a balanced diet.' : 'A satisfying meal to keep you energized.'} Enjoy as part of a varied diet.`,
    `${mealName} offers a good nutritional profile. ${nutrition?.carbs > 30 ? 'Good energy source for active days.' : 'Lower carb option for those watching intake.'} Pair with vegetables for added benefits.`
  ];
  return analyses[Math.floor(Math.random() * analyses.length)];
}

function generateMockSuggestions(preferences?: string): Array<{ name: string; description: string; estimatedCalories: number }> {
  const suggestions = [
    { name: 'Mediterranean Quinoa Bowl', description: 'Quinoa with chickpeas, cucumber, tomatoes, and feta', estimatedCalories: 420 },
    { name: 'Grilled Salmon with Vegetables', description: 'Omega-rich salmon with seasonal roasted vegetables', estimatedCalories: 380 },
    { name: 'Asian Chicken Stir-Fry', description: 'Lean chicken with colorful vegetables in light sauce', estimatedCalories: 350 },
    { name: 'Greek Yogurt Parfait', description: 'Protein-rich yogurt with fresh berries and granola', estimatedCalories: 280 },
    { name: 'Turkey Avocado Wrap', description: 'Whole grain wrap with lean turkey and fresh avocado', estimatedCalories: 400 }
  ];
  return suggestions.slice(0, 3);
}

function generateMockTips(mealName: string, nutrition?: any): string[] {
  const tips = [
    'Eat slowly to improve digestion and satisfaction',
    'Pair with a glass of water for better nutrient absorption',
    'Add leafy greens for extra vitamins and fiber'
  ];

  if (nutrition?.protein > 25) {
    tips.push('Great post-workout meal for muscle recovery');
  }
  if (nutrition?.calories > 600) {
    tips.push('Consider this as your main meal of the day');
  }

  return tips.slice(0, 3);
}

export default router;
