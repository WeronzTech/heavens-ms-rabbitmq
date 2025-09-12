import SecurityLog from '../models/securityLog.model.js';

export const securityLogger = async (req, user, eventType, metadata = {}) => {
  try {
    await SecurityLog.create({
      userId: user.id,
      userModel: user.constructor.modelName,
      eventType,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      metadata: {
        ...metadata,
        endpoint: req.originalUrl,
        method: req.method
      }
    });
  } catch (error) {
    console.error('Security logging failed:', error);
  }
};

export const refreshRateLimiter = async (req, res, next) => {
  try {
    const MAX_REFRESHES_PER_HOUR = 10;
    const { id } = req.user; // From JWT
    
    const recentRefreshes = await SecurityLog.countDocuments({
      userId: id,
      eventType: 'TOKEN_REFRESH',
      createdAt: { $gt: new Date(Date.now() - 3600000) }
    });

    if (recentRefreshes >= MAX_REFRESHES_PER_HOUR) {
      await Token.deleteMany({ userId: id });
      
      await securityLogger(req, req.user, 'REFRESH_RATE_LIMIT', {
        attempts: recentRefreshes,
        threshold: MAX_REFRESHES_PER_HOUR
      });

      return res.status(429).json({ 
        error: 'Too many refresh attempts. Account temporarily locked.' 
      });
    }
    
    next();
  } catch (error) {
    next(error);
  }
};