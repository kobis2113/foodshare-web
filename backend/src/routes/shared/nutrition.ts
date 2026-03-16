import { Router, Response, RequestHandler } from 'express';
import { query, validationResult } from 'express-validator';
import { combinedAuth } from '../../middleware/firebaseAuth';
import { AuthRequest } from '../../middleware/jwtAuth';

const router = Router();

/**
 * @swagger
 * /api/nutrition:
 *   get:
 *     summary: Get nutrition info for a food item
 *     tags: [Nutrition]
 *     security:
 *       - bearerAuth: []
 *       - firebaseAuth: []
 *     parameters:
 *       - in: query
 *         name: query
 *         required: true
 *         schema:
 *           type: string
 *         description: Food item to search (e.g., "Mediterranean Salad")
 *     responses:
 *       200:
 *         description: Nutrition information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 calories:
 *                   type: number
 *                 protein:
 *                   type: number
 *                 carbs:
 *                   type: number
 *                 fat:
 *                   type: number
 *                 healthTips:
 *                   type: array
 *                   items:
 *                     type: string
 */
router.get(
  '/',
  combinedAuth as RequestHandler,
  [query('query').trim().isLength({ min: 1, max: 200 })],
  (async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const foodQuery = req.query.query as string;

      // Call external nutrition API
      const nutritionData = await fetchNutritionData(foodQuery);

      res.json(nutritionData);
    } catch (error) {
      console.error('Nutrition API error:', error);
      res.status(500).json({ message: 'Failed to fetch nutrition data' });
    }
  }) as RequestHandler
);

/**
 * Fetch nutrition data from external API
 * Using CalorieNinjas API (free tier available)
 */
async function fetchNutritionData(query: string) {
  const apiKey = process.env.NUTRITION_API_KEY;
  const apiUrl = process.env.NUTRITION_API_URL || 'https://api.calorieninjas.com/v1/nutrition';

  if (!apiKey) {
    // Return mock data if no API key configured
    return generateMockNutritionData(query);
  }

  try {
    const response = await fetch(`${apiUrl}?query=${encodeURIComponent(query)}`, {
      headers: {
        'X-Api-Key': apiKey
      }
    });

    if (!response.ok) {
      throw new Error('Nutrition API request failed');
    }

    const data = await response.json() as { items?: Array<{
      calories?: number;
      protein_g?: number;
      carbohydrates_total_g?: number;
      fat_total_g?: number;
      fiber_g?: number;
      sugar_g?: number;
    }> };

    // Aggregate nutrition from all items
    const nutrition = {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0,
      sugar: 0
    };

    if (data.items && data.items.length > 0) {
      data.items.forEach((item) => {
        nutrition.calories += item.calories || 0;
        nutrition.protein += item.protein_g || 0;
        nutrition.carbs += item.carbohydrates_total_g || 0;
        nutrition.fat += item.fat_total_g || 0;
        nutrition.fiber += item.fiber_g || 0;
        nutrition.sugar += item.sugar_g || 0;
      });
    }

    // Generate health tips based on nutrition values
    const healthTips = generateHealthTips(nutrition);

    return {
      calories: Math.round(nutrition.calories),
      protein: Math.round(nutrition.protein),
      carbs: Math.round(nutrition.carbs),
      fat: Math.round(nutrition.fat),
      fiber: Math.round(nutrition.fiber),
      sugar: Math.round(nutrition.sugar),
      healthTips
    };
  } catch (error) {
    console.error('External API error:', error);
    return generateMockNutritionData(query);
  }
}

/**
 * Generate mock nutrition data for development
 */
function generateMockNutritionData(query: string) {
  const baseCal = 200 + Math.floor(Math.random() * 300);

  return {
    calories: baseCal,
    protein: Math.floor(baseCal * 0.04),
    carbs: Math.floor(baseCal * 0.1),
    fat: Math.floor(baseCal * 0.03),
    fiber: Math.floor(Math.random() * 10),
    sugar: Math.floor(Math.random() * 15),
    healthTips: generateHealthTips({
      calories: baseCal,
      protein: Math.floor(baseCal * 0.04),
      carbs: Math.floor(baseCal * 0.1),
      fat: Math.floor(baseCal * 0.03),
      fiber: Math.floor(Math.random() * 10),
      sugar: Math.floor(Math.random() * 15)
    }),
    note: 'Mock data - configure NUTRITION_API_KEY for real data'
  };
}

/**
 * Generate health tips based on nutrition values
 */
function generateHealthTips(nutrition: {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
}): string[] {
  const tips: string[] = [];

  // Protein tips
  if (nutrition.protein >= 20) {
    tips.push('Great protein content! Helps with muscle building and repair.');
  } else if (nutrition.protein < 10) {
    tips.push('Consider adding a protein source like chicken, fish, or legumes.');
  }

  // Fiber tips
  if (nutrition.fiber && nutrition.fiber >= 5) {
    tips.push('Good fiber content! Helps with digestion and keeps you full longer.');
  }

  // Calorie tips
  if (nutrition.calories < 300) {
    tips.push('Light meal option - great for calorie-conscious eating.');
  } else if (nutrition.calories > 600) {
    tips.push('High-energy meal - perfect for active days or as a main course.');
  }

  // Balance tip
  if (nutrition.protein > 15 && nutrition.carbs > 20 && nutrition.fat > 10) {
    tips.push('This looks like a balanced meal with good macronutrient distribution!');
  }

  // Sugar warning
  if (nutrition.sugar && nutrition.sugar > 20) {
    tips.push('Higher sugar content - enjoy in moderation.');
  }

  // Default tip if no others
  if (tips.length === 0) {
    tips.push('Enjoy your meal as part of a balanced diet!');
  }

  return tips.slice(0, 3); // Max 3 tips
}

export default router;
