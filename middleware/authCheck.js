// middleware/authCheck.js

const authCheck = (req, res, next) => {
    const isApiRequest = req.originalUrl.startsWith('/api');

    if (!req.isAuthenticated || !req.isAuthenticated()) {
        if (isApiRequest) {
            return res.status(401).json({ message: 'Unauthorized: Please log in.' });
        }
        return res.redirect('/login');
    }

    next();
};

module.exports = authCheck;
