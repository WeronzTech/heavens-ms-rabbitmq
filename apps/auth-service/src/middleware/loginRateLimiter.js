import { RateLimiterRedis } from 'rate-limiter-flexible';
import Redis from 'ioredis';

const redisClient = new Redis({
  host: 'redis',
  port: 6379,
  enableOfflineQueue: false,
});

// Per email (student-level)
const emailLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: 'login_email',
  points: 5,
  duration: 15 * 60,
});

// Per device
const deviceLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: 'login_device',
  points: 5,
  duration: 15 * 60,
});

// Soft limiter per IP
const ipLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: 'login_ip',
  points: 50,
  duration: 15 * 60,
});

const loginRateLimiter = async (req, res, next) => {
  const email = req.body?.email?.toLowerCase();
  const deviceId = req.body?.deviceId;
  const ip = req.ip;

  if (!email || !deviceId) {
    return res.status(400).json({ error: 'Email and deviceId are required for login' });
  }

  try {
    // Consume points for email, deviceId, and IP
    await Promise.all([
      emailLimiter.consume(email),
      deviceLimiter.consume(deviceId),
      ipLimiter.consume(ip)
    ]);

    return next();
  } catch (rejRes) {
    const retrySecs = Math.round(rejRes.msBeforeNext / 1000) || 60;
    return res.status(429).json({
      error: 'Too many login attempts. Please try again later.',
      retryAfter: `${retrySecs} seconds`
    });
  }
};

export default loginRateLimiter;
