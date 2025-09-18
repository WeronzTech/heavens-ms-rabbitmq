export const verifyInternalKey = (req, res, next) => {
    const internalKey = req.headers['x-internal-key'];

    if (!internalKey || internalKey !== process.env.INTERNAL_SECRET_KEY) {
        return res.status(403).json({ error: 'Unauthorized access' });
    }

    next();
};
