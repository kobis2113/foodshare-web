import mongoose, { Document, Schema, Types } from 'mongoose';

/**
 * @swagger
 * components:
 *   schemas:
 *     Post:
 *       type: object
 *       required:
 *         - author
 *         - mealName
 *         - image
 *       properties:
 *         _id:
 *           type: string
 *         author:
 *           type: string
 *           description: Reference to User ID
 *         mealName:
 *           type: string
 *           description: Name of the meal
 *         description:
 *           type: string
 *           description: Post description
 *         image:
 *           type: string
 *           description: URL to meal image
 *         nutrition:
 *           type: object
 *           properties:
 *             calories:
 *               type: number
 *             protein:
 *               type: number
 *             carbs:
 *               type: number
 *             fat:
 *               type: number
 *             healthTips:
 *               type: array
 *               items:
 *                 type: string
 *         likes:
 *           type: array
 *           items:
 *             type: string
 *           description: Array of User IDs who liked the post
 *         likesCount:
 *           type: number
 *         commentsCount:
 *           type: number
 *         createdAt:
 *           type: string
 *           format: date-time
 */

export interface INutrition {
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  healthTips?: string[];
}

export interface IPost extends Document {
  author: Types.ObjectId;
  mealName: string;
  description?: string;
  image: string;
  nutrition?: INutrition;
  likes: Types.ObjectId[];
  likesCount: number;
  commentsCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const postSchema = new Schema<IPost>(
  {
    author: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    mealName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500
    },
    image: {
      type: String,
      required: true
    },
    nutrition: {
      calories: Number,
      protein: Number,
      carbs: Number,
      fat: Number,
      healthTips: [String]
    },
    likes: [{
      type: Schema.Types.ObjectId,
      ref: 'User'
    }],
    likesCount: {
      type: Number,
      default: 0
    },
    commentsCount: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

// Index for efficient feed queries
postSchema.index({ createdAt: -1 });
postSchema.index({ author: 1, createdAt: -1 });

// Text index for search
postSchema.index({ mealName: 'text', description: 'text' });

export const Post = mongoose.model<IPost>('Post', postSchema);
