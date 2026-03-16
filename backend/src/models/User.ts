import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       required:
 *         - email
 *         - displayName
 *       properties:
 *         _id:
 *           type: string
 *           description: Auto-generated MongoDB ID
 *         email:
 *           type: string
 *           format: email
 *           description: User email (unique, links web & mobile auth)
 *         displayName:
 *           type: string
 *           description: Display name shown in app
 *         profileImage:
 *           type: string
 *           description: URL to profile image
 *         firebaseUid:
 *           type: string
 *           description: Firebase UID (for mobile auth)
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

export interface IUser extends Document {
  email: string;
  displayName: string;
  profileImage?: string;
  password?: string; // For web auth (hashed)
  refreshTokens: string[]; // For web JWT refresh
  firebaseUid?: string; // For mobile auth
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    displayName: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 50
    },
    profileImage: {
      type: String,
      default: ''
    },
    password: {
      type: String,
      minlength: 6,
      select: false // Don't include in queries by default
    },
    refreshTokens: {
      type: [String],
      default: [],
      select: false
    },
    firebaseUid: {
      type: String,
      sparse: true, // Allow null but unique when set
      index: true
    }
  },
  {
    timestamps: true
  }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error: any) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

export const User = mongoose.model<IUser>('User', userSchema);
