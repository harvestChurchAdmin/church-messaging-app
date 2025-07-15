// routes/auth-routes.js

const router = require('express').Router();
const passport = require('passport');
const authCheck = require('../middleware/authCheck'); // Import authCheck if needed for other routes
const path = require('path'); // Still needed for path.join if other routes use it

// The /auth/login route is now handled directly by server.js at the /login path.
// This route is removed to avoid conflict and ensure consistent logo injection.
// router.get('/login', (req, res) => {
//     res.sendFile(path.join(__dirname, '..', 'public', 'login.html'));
// });

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
        res.redirect('/login'); // Redirect to the main login page after logout
    });
});

// Example of a protected route (e.g., a profile page)
router.get('/profile', authCheck, (req, res) => {
    res.send(`Welcome to your profile, ${req.user.displayName || 'User'}!`);
});

module.exports = router;
