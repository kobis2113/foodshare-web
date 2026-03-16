import mongoose, { Document, Schema, Types } from 'mongoose';

/**
 * @swagger
 * components:
 *   schemas:
 *     Comment:
 *       type: object
 *       required:
 *         - post
 *         - author
 *         - text
 *       properties:
 *         _id:
 *           type: string
 *         post:
 *           type: string
 *           description: Reference to Post ID
 *         author:
 *           type: string
 *           description: Reference to User ID
 *         text:
 *           type: string
 *           description: Comment content
 *         createdAt:
 *           type: string
 *           format: date-time
 */

export interface IComment extends Document {
  post: Types.ObjectId;
  author: Types.ObjectId;
  text: string;
  createdAt: Date;
  updatedAt: Date;
}

const commentSchema = new Schema<IComment>(
  {
    post: {
      type: Schema.Types.ObjectId,
      ref: 'Post',
      required: true,
      index: true
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500
    }
  },
  {
    timestamps: true
  }
);

// Index for efficient comment retrieval
commentSchema.index({ post: 1, createdAt: -1 });

export const Comment = mongoose.model<IComment>('Comment', commentSchema);
