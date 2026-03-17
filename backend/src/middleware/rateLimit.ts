import { Request, Response, NextFunction } from 'express';
import { RATE_LIMIT } from '../constants';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

const store: RateLimitStore = {};

interface RateLimitOptions {
  windowMs: number;
  max: number;
  message?: string;
}

export const createRateLimiter = (options: RateLimitOptions) => {
  const { windowMs, max, message = 'Too many requests, please try again later' } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip || 'unknown';
    const now = Date.now();

    if (!store[key] || now > store[key].resetTime) {
      store[key] = {
        count: 1,
        resetTime: now + windowMs
      };
      return next();
    }

    store[key].count++;

    if (store[key].count > max) {
      const retryAfter = Math.ceil((store[key].resetTime - now) / 1000);
      res.set('Retry-After', String(retryAfter));
      return res.status(429).json({
        status: 'error',
        message
      });
    }

    next();
  };
};

export const authLimiter = createRateLimiter({
  windowMs: RATE_LIMIT.LOGIN.WINDOW_MS,
  max: RATE_LIMIT.LOGIN.MAX_REQUESTS,
  message: RATE_LIMIT.LOGIN.MESSAGE
});

export const apiLimiter = createRateLimiter({
  windowMs: RATE_LIMIT.GENERAL.WINDOW_MS,
  max: RATE_LIMIT.GENERAL.MAX_REQUESTS,
  message: RATE_LIMIT.GENERAL.MESSAGE
});

setInterval(() => {
  const now = Date.now();
  for (const key in store) {
    if (store[key].resetTime < now) {
      delete store[key];
    }
  }
}, 60000);
