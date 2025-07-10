// middleware/authCheck.js

const authCheck = (req, res, next) => {
    if (!req.isAuthenticated()) {
        console.log('User not authenticated. Redirecting to login.');
        res.redirect('/auth/login');
    } else {
        next();
    }
};

module.exports = authCheck;