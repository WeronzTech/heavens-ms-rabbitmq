import Token from '../models/token.model.js';

export const verifyDevice = async (req, res, next) => {
  try {
    // Get device ID from token and headers
    const tokenDevice = req.user?.deviceId;
    const currentDevice = req.headers['x-device-id'];
    
    if (!tokenDevice || !currentDevice) {
      return res.status(401).json({ error: 'Device verification required' });
    }
    
    if (tokenDevice !== currentDevice) {
      // Logout all sessions for this device
      await Token.deleteMany({ 
        userId: req.user.id, 
        deviceId: tokenDevice 
      });
      return res.status(401).json({ 
        error: 'Session terminated due to device change' 
      });
    }
    
    next();
  } catch (error) {
    console.error('Device verification failed:', error);
    res.status(500).json({ error: 'Device verification error' });
  }
};

// Add to your existing auth middleware
export const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token provided' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    
    // Verify device after standard auth
    await verifyDevice(req, res, next); 
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};