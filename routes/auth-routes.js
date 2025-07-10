// routes/auth-routes.js

const router = require('express').Router();
const passport = require('passport');
// CHANGE THIS LINE:
// const { isAuthenticated } = require('../middleware/authCheck');
const isAuthenticated = require('../middleware/authCheck'); // <-- CORRECTED IMPORT

// --- Google OAuth Routes ---

// 1. Authentication Login Route
router.get('/google', passport.authenticate('google', {
    scope: ['profile', 'email']
}));

// 2. Google OAuth Callback Route
router.get('/google/callback', passport.authenticate('google'), (req, res) => {
    console.log('User has logged in successfully:', req.user);
    res.redirect('/');
});

// --- Logout Route ---
router.get('/logout', (req, res, next) => {
    req.logout((err) => {
        if (err) { return next(err); }
        res.redirect('/');
    });
});

// Example of a protected route (e.g., a profile page)
// NOW USING isAuthenticated
router.get('/profile', isAuthenticated, (req, res) => {
    res.send(`Welcome to your profile, ${req.user.displayName || 'User'}!`);
});

module.exports = router;