import { verifyToken } from '../utils/jwt.js';

export const validateToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  const decoded = verifyToken(token);

  if (!decoded) return res.status(403).json({ error: 'Unauthorized' });

  req.user = decoded;
  next();
};
