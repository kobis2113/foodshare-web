import { Router, Response, RequestHandler } from 'express';
import { body, query, validationResult } from 'express-validator';
import { jwtAuth } from '../../middleware/jwtAuth';
import { AuthRequest } from '../../middleware/jwtAuth';
import { Post } from '../../models/Post';
import { RATE_LIMIT, VALIDATION, NUTRITION_THRESHOLDS, USDA_NUTRIENT_IDS, PAGINATION } from '../../constants';

const router = Router();
const authMiddleware = jwtAuth as RequestHandler;

// AI-specific rate limiting (stricter than general API)
const aiRequestCounts = new Map<string, { count: number; resetTime: number }>();

const checkAIRateLimit = (userId: string): boolean => {
  const now = Date.now();
  const userLimit = aiRequestCounts.get(userId);

  if (!userLimit || now > userLimit.resetTime) {
    aiRequestCounts.set(userId, { count: 1, resetTime: now + RATE_LIMIT.AI.WINDOW_MS });
    return true;
  }

  if (userLimit.count >= RATE_LIMIT.AI.REQUESTS_PER_MINUTE) {
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
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 4096
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

async function callGeminiVisionAPI(prompt: string, imageBase64: string, mimeType: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            {
              inline_data: {
                mime_type: mimeType,
                data: imageBase64
              }
            }
          ]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048
        }
      })
    }
  );

  if (!response.ok) {
    const errorData = await response.json() as GeminiResponse;
    const errorMessage = errorData.error?.message || 'Gemini Vision API request failed';
    throw new Error(errorMessage);
  }

  const data = await response.json() as GeminiResponse;
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error('No response from Gemini Vision API');
  }

  return text;
}

// Fallback nutrition data from USDA FoodData Central
async function fetchNutritionFallback(query: string): Promise<{
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  healthTips: string[];
  error?: boolean;
  errorMessage?: string;
}> {
  const apiKey = process.env.USDA_API_KEY;
  const apiUrl = process.env.USDA_API_URL || 'https://api.nal.usda.gov/fdc/v1';

  if (!apiKey) {
    console.error('USDA_API_KEY not configured');
    return getDefaultNutrition();
  }

  try {
    const response = await fetch(
      `${apiUrl}/foods/search?query=${encodeURIComponent(query)}&pageSize=1&api_key=${apiKey}`
    );

    if (!response.ok) {
      throw new Error('USDA API request failed');
    }

    const data = await response.json() as {
      foods?: Array<{
        description?: string;
        foodNutrients?: Array<{
          nutrientId?: number;
          nutrientName?: string;
          value?: number;
        }>;
      }>;
    };

    if (data.foods && data.foods.length > 0) {
      const food = data.foods[0];
      const nutrients = food.foodNutrients || [];

      // USDA nutrient IDs
      const caloriesNutrient = nutrients.find(n => n.nutrientId === USDA_NUTRIENT_IDS.ENERGY);
      const proteinNutrient = nutrients.find(n => n.nutrientId === USDA_NUTRIENT_IDS.PROTEIN);
      const carbsNutrient = nutrients.find(n => n.nutrientId === USDA_NUTRIENT_IDS.CARBS);
      const fatNutrient = nutrients.find(n => n.nutrientId === USDA_NUTRIENT_IDS.FAT);

      const calories = caloriesNutrient?.value || 0;
      const protein = proteinNutrient?.value || 0;
      const carbs = carbsNutrient?.value || 0;
      const fat = fatNutrient?.value || 0;

      return {
        calories: Math.round(calories),
        protein: Math.round(protein),
        carbs: Math.round(carbs),
        fat: Math.round(fat),
        healthTips: generateBasicTips({ calories, protein, carbs, fat }),
        error: false
      };
    }

    // No food found in USDA database
    return {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      healthTips: [],
      error: true,
      errorMessage: 'Food not found in nutrition database'
    };
  } catch (error) {
    console.error('USDA API error:', error);
    return getDefaultNutrition();
  }
}

function getDefaultNutrition() {
  return {
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    healthTips: ['Nutrition data unavailable. Enjoy your meal as part of a balanced diet!'],
    error: true,
    errorMessage: 'Could not fetch nutrition data'
  };
}

function generateBasicTips(nutrition: { calories: number; protein: number; carbs: number; fat: number }): string[] {
  const tips: string[] = [];
  if (nutrition.protein >= NUTRITION_THRESHOLDS.HIGH_PROTEIN) tips.push('Great protein content for muscle building!');
  else if (nutrition.protein < NUTRITION_THRESHOLDS.LOW_PROTEIN) tips.push('Consider adding protein like chicken or legumes.');
  if (nutrition.calories < NUTRITION_THRESHOLDS.LOW_CALORIE) tips.push('Light meal - great for calorie-conscious eating.');
  else if (nutrition.calories > NUTRITION_THRESHOLDS.HIGH_CALORIE) tips.push('High-energy meal - perfect for active days.');
  if (nutrition.protein > NUTRITION_THRESHOLDS.BALANCED_PROTEIN && nutrition.carbs > NUTRITION_THRESHOLDS.BALANCED_CARBS && nutrition.fat > NUTRITION_THRESHOLDS.BALANCED_FAT) {
    tips.push('Well-balanced macronutrient distribution!');
  }
  if (tips.length === 0) tips.push('Enjoy your meal as part of a balanced diet!');
  return tips.slice(0, 3);
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
 * /api/ai/analyze-meal:
 *   post:
 *     summary: Analyze meal image with AI vision - verifies food, estimates nutrition, generates tips
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
 *               - imageBase64
 *             properties:
 *               mealName:
 *                 type: string
 *               description:
 *                 type: string
 *               imageBase64:
 *                 type: string
 *               mimeType:
 *                 type: string
 *     responses:
 *       200:
 *         description: AI meal analysis with nutrition and tips
 */
router.post(
  '/analyze-meal',
  authMiddleware,
  [
    body('mealName').trim().isLength({ min: 1, max: 200 }),
    body('description').optional().trim().isLength({ max: 500 }),
    body('imageBase64').isString().isLength({ min: 100 }),
    body('mimeType').optional().isString()
  ],
  (async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { mealName, description, imageBase64, mimeType = 'image/jpeg' } = req.body;

      const prompt = `You are a nutrition expert analyzing a food image.

Look at this image and the provided information:
- Meal name: "${mealName}"
${description ? `- Description: "${description}"` : ''}

Please analyze and respond in JSON format ONLY:
{
  "isFood": true/false,
  "foodDetected": "what food you see in the image",
  "calories": estimated_number,
  "protein": estimated_grams,
  "carbs": estimated_grams,
  "fat": estimated_grams,
  "confidence": "low/medium/high",
  "healthTips": ["tip1", "tip2", "tip3"]
}

Guidelines:
- If the image does NOT contain food, set isFood to false and provide zeros for nutrition
- Base your estimates on typical serving sizes visible in the image
- Health tips should be specific to this meal and actionable
- Be realistic with estimates based on portion size in the image

Return ONLY the JSON object, no other text.`;

      try {
        const aiResponse = await callGeminiVisionAPI(prompt, imageBase64, mimeType);

        // Parse AI response - handle markdown code blocks and raw JSON
        let jsonString: string | null = null;

        // Try to extract from markdown code block first
        const codeBlockMatch = aiResponse.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (codeBlockMatch) {
          jsonString = codeBlockMatch[1].trim();
        } else {
          // Fall back to raw JSON extraction
          const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            jsonString = jsonMatch[0];
          }
        }

        if (!jsonString) {
          console.error('AI response (no JSON found):', aiResponse.substring(0, 500));
          throw new Error('Invalid AI response format');
        }

        const analysis = JSON.parse(jsonString);

        // Validate the response has required fields
        if (typeof analysis.isFood !== 'boolean') {
          throw new Error('Invalid AI response: missing isFood field');
        }

        res.json({
          ...analysis,
          source: 'gemini',
          mealName
        });

      } catch (aiError: any) {
        console.error('AI Vision analysis failed, using USDA data:', aiError.message);

        // Fallback to USDA FoodData Central
        const fallbackData = await fetchNutritionFallback(mealName);

        res.json({
          isFood: !fallbackData.error, // If error, we couldn't verify it's food
          foodDetected: mealName,
          calories: fallbackData.calories,
          protein: fallbackData.protein,
          carbs: fallbackData.carbs,
          fat: fallbackData.fat,
          confidence: 'low',
          healthTips: fallbackData.healthTips,
          source: 'fallback',
          mealName,
          fallbackReason: aiError.message?.includes('quota') ? 'AI quota exceeded' : 'AI service unavailable',
          nutritionError: fallbackData.error,
          nutritionErrorMessage: fallbackData.errorMessage
        });
      }

    } catch (error: any) {
      console.error('Analyze meal error:', error.message);
      res.status(500).json({
        message: 'Failed to analyze meal',
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

      // First, fetch all posts from the database
      const allPosts = await Post.find()
        .sort({ createdAt: -1 })
        .limit(50) // Limit to last 50 posts for AI processing
        .populate('author', 'displayName profileImage')
        .lean();

      if (allPosts.length === 0) {
        res.json({
          posts: [],
          query: userQuery,
          searchExplanation: 'No posts available yet.',
          aiInsights: null
        });
        return;
      }

      // Create a summary of posts for AI to analyze
      const postSummaries = allPosts.map((p, index) => ({
        id: index,
        mealName: p.mealName,
        description: p.description || '',
        calories: p.nutrition?.calories || 0,
        protein: p.nutrition?.protein || 0,
        carbs: p.nutrition?.carbs || 0,
        fat: p.nutrition?.fat || 0
      }));

      // Ask AI to match posts to the user's query
      const matchPrompt = `Food search. Query: "${userQuery}"

Meals:
${JSON.stringify(postSummaries)}

Return matching meal IDs. Consider name, category, nutrition, health concepts.
JSON only: {"matchingIds":[0,2,5],"searchExplanation":"short reason"}
Empty array if none match.`;

      let matchingPostIds: number[] = [];
      let searchExplanation = '';

      try {
        const matchResponse = await callGeminiAPI(matchPrompt);

        // Parse AI response
        let jsonString: string | null = null;
        const codeBlockMatch = matchResponse.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (codeBlockMatch) {
          jsonString = codeBlockMatch[1].trim();
        } else {
          const jsonMatch = matchResponse.match(/\{[\s\S]*\}/);
          if (jsonMatch) jsonString = jsonMatch[0];
        }

        if (jsonString) {
          const parsed = JSON.parse(jsonString);
          matchingPostIds = parsed.matchingIds || [];
          searchExplanation = parsed.searchExplanation || '';
        } else {
          console.error('AI smart search - no JSON found in response:', matchResponse.substring(0, 500));
        }
      } catch (error: any) {
        console.error('AI matching failed:', error.message);
        // Fallback to basic text search
        const lowerQuery = userQuery.toLowerCase();
        matchingPostIds = postSummaries
          .filter(p =>
            p.mealName.toLowerCase().includes(lowerQuery) ||
            p.description.toLowerCase().includes(lowerQuery)
          )
          .map(p => p.id);
        searchExplanation = 'Using basic keyword search';
      }

      // Get the matching posts
      const matchingPosts = matchingPostIds
        .filter(id => id >= 0 && id < allPosts.length)
        .map(id => allPosts[id]);

      // Add isLiked field
      const postsWithLikeStatus = matchingPosts.map(post => ({
        ...post,
        isLiked: post.likes.some((likeId: any) => likeId.toString() === req.userId)
      }));

      let aiInsights = null;
      if (postsWithLikeStatus.length > 0) {
        const topPostSummaries = postsWithLikeStatus.slice(0, 5).map(p => ({
          name: p.mealName,
          description: p.description || '',
          nutrition: p.nutrition
        }));

        const insightsPrompt = `Based on the search "${userQuery}", here are the matching meals:
${JSON.stringify(topPostSummaries, null, 2)}

Provide a brief helpful response (2-3 sentences) explaining how these results match the search and any nutrition insights. Be concise and friendly.`;

        try {
          aiInsights = await callGeminiAPI(insightsPrompt);
        } catch {
          aiInsights = null;
        }
      }

      res.json({
        posts: postsWithLikeStatus,
        query: userQuery,
        searchExplanation,
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
          .limit(PAGINATION.SEARCH_LIMIT)
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
