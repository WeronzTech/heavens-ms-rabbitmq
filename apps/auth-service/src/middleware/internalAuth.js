export const internalAuth = (req, res, next) => {
  console.log(req.headers)
  const apiKey = req.headers['x-internal-key'];
  if (!apiKey || apiKey !== process.env.INTERNAL_SECRET_KEY) {
    return res.status(403).json({ message: 'Forbidden: Invalid internal key' });
  }
  next();
};
