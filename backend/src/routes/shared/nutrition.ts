import { Router, Response, RequestHandler } from 'express';
import { query, validationResult } from 'express-validator';
import { combinedAuth } from '../../middleware/firebaseAuth';
import { AuthRequest } from '../../middleware/jwtAuth';
import { USDA_NUTRIENT_IDS, NUTRITION_THRESHOLDS, VALIDATION } from '../../constants';

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
 * Fetch nutrition data from USDA FoodData Central API
 */
async function fetchNutritionData(query: string) {
  const apiKey = process.env.USDA_API_KEY;
  const apiUrl = process.env.USDA_API_URL || 'https://api.nal.usda.gov/fdc/v1';

  if (!apiKey) {
    console.error('USDA_API_KEY not configured');
    return {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0,
      sugar: 0,
      healthTips: ['Nutrition data unavailable. Configure USDA_API_KEY.'],
      source: 'none'
    };
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
      const calories = nutrients.find(n => n.nutrientId === USDA_NUTRIENT_IDS.ENERGY)?.value || 0;
      const protein = nutrients.find(n => n.nutrientId === USDA_NUTRIENT_IDS.PROTEIN)?.value || 0;
      const carbs = nutrients.find(n => n.nutrientId === USDA_NUTRIENT_IDS.CARBS)?.value || 0;
      const fat = nutrients.find(n => n.nutrientId === USDA_NUTRIENT_IDS.FAT)?.value || 0;
      const fiber = nutrients.find(n => n.nutrientId === USDA_NUTRIENT_IDS.FIBER)?.value || 0;
      const sugar = nutrients.find(n => n.nutrientId === USDA_NUTRIENT_IDS.SUGAR)?.value || 0;

      const nutrition = { calories, protein, carbs, fat, fiber, sugar };
      const healthTips = generateHealthTips(nutrition);

      return {
        calories: Math.round(calories),
        protein: Math.round(protein),
        carbs: Math.round(carbs),
        fat: Math.round(fat),
        fiber: Math.round(fiber),
        sugar: Math.round(sugar),
        healthTips,
        foodMatch: food.description,
        source: 'usda'
      };
    }

    return {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0,
      sugar: 0,
      healthTips: ['No matching food found in USDA database.'],
      source: 'none'
    };
  } catch (error) {
    console.error('USDA API error:', error);
    return {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0,
      sugar: 0,
      healthTips: ['Failed to fetch nutrition data.'],
      source: 'error'
    };
  }
}

/**
 * Generate estimated nutrition data based on meal keywords
 */
function generateMockNutritionData(query: string) {
  const q = query.toLowerCase();

  // Estimate based on common food patterns
  let calories = 350, protein = 15, carbs = 40, fat = 12, fiber = 3, sugar = 5;

  // High protein foods
  if (q.includes('chicken') || q.includes('beef') || q.includes('steak') || q.includes('fish') || q.includes('salmon') || q.includes('tuna')) {
    protein = 30; calories = 400; fat = 15; carbs = 10;
  }
  // Salads
  else if (q.includes('salad')) {
    calories = 250; protein = 10; carbs = 20; fat = 15; fiber = 6;
  }
  // Pasta/Rice dishes
  else if (q.includes('pasta') || q.includes('spaghetti') || q.includes('rice') || q.includes('noodle')) {
    calories = 450; carbs = 60; protein = 12; fat = 15;
  }
  // Burgers/Sandwiches
  else if (q.includes('burger') || q.includes('sandwich')) {
    calories = 550; protein = 25; carbs = 45; fat = 28;
  }
  // Pizza
  else if (q.includes('pizza')) {
    calories = 300; protein = 12; carbs = 35; fat = 14; // per slice
  }
  // Sushi
  else if (q.includes('sushi') || q.includes('roll')) {
    calories = 350; protein = 15; carbs = 45; fat = 8;
  }
  // Breakfast items
  else if (q.includes('egg') || q.includes('omelette') || q.includes('omelet')) {
    calories = 280; protein = 20; carbs = 5; fat = 20;
  }
  else if (q.includes('pancake') || q.includes('waffle')) {
    calories = 400; carbs = 55; protein = 8; fat = 16; sugar = 20;
  }
  // Desserts
  else if (q.includes('cake') || q.includes('cookie') || q.includes('ice cream') || q.includes('dessert')) {
    calories = 350; carbs = 50; sugar = 35; fat = 15; protein = 4;
  }
  // Soup
  else if (q.includes('soup')) {
    calories = 200; protein = 10; carbs = 25; fat = 8; fiber = 4;
  }
  // Smoothie/Shake
  else if (q.includes('smoothie') || q.includes('shake')) {
    calories = 300; carbs = 45; protein = 10; fat = 8; sugar = 30;
  }

  return {
    calories,
    protein,
    carbs,
    fat,
    fiber,
    sugar,
    healthTips: generateHealthTips({ calories, protein, carbs, fat, fiber, sugar }),
    estimated: true
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
  if (nutrition.protein >= NUTRITION_THRESHOLDS.HIGH_PROTEIN) {
    tips.push('Great protein content! Helps with muscle building and repair.');
  } else if (nutrition.protein < NUTRITION_THRESHOLDS.LOW_PROTEIN) {
    tips.push('Consider adding a protein source like chicken, fish, or legumes.');
  }

  // Fiber tips
  if (nutrition.fiber && nutrition.fiber >= 5) {
    tips.push('Good fiber content! Helps with digestion and keeps you full longer.');
  }

  // Calorie tips
  if (nutrition.calories < NUTRITION_THRESHOLDS.LOW_CALORIE) {
    tips.push('Light meal option - great for calorie-conscious eating.');
  } else if (nutrition.calories > NUTRITION_THRESHOLDS.HIGH_CALORIE) {
    tips.push('High-energy meal - perfect for active days or as a main course.');
  }

  // Balance tip
  if (nutrition.protein > NUTRITION_THRESHOLDS.BALANCED_PROTEIN && nutrition.carbs > NUTRITION_THRESHOLDS.BALANCED_CARBS && nutrition.fat > NUTRITION_THRESHOLDS.BALANCED_FAT) {
    tips.push('This looks like a balanced meal with good macronutrient distribution!');
  }

  // Sugar warning
  if (nutrition.sugar && nutrition.sugar > NUTRITION_THRESHOLDS.HIGH_SUGAR) {
    tips.push('Higher sugar content - enjoy in moderation.');
  }

  // Default tip if no others
  if (tips.length === 0) {
    tips.push('Enjoy your meal as part of a balanced diet!');
  }

  return tips.slice(0, 3); // Max 3 tips
}

export default router;
