// server.js

const express = require('express');
const app = express();
const passport = require('passport');
const session = require('express-session');
const path = require('path');
require('dotenv').config();

// Import routes and middleware
const apiRoutes = require('./routes/api-routes');
const authRoutes = require('./routes/auth-routes');
const authCheck = require('./middleware/authCheck');
// CORRECTED PATH: Ensure this path is correct based on where passport-setup.js is located
require('./middleware/config/passport-setup'); 

// Middleware setup
app.use(express.json()); // For parsing application/json
app.use(express.urlencoded({ extended: true })); // For parsing application/x-www-form-urlencoded

// Session middleware - IMPORTANT: Keep this before passport.initialize()
app.use(session({
    secret: process.env.SESSION_SECRET || 'a_very_secret_key', // Use an env variable for secret
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000 } // 24 hours
}));

// Passport initialization
app.use(passport.initialize());
app.use(passport.session());

// Authentication routes (e.g., /auth/google, /auth/google/redirect)
app.use('/auth', authRoutes);

// Protected API routes
// The authCheck middleware will run before any /api route.
// If not authenticated, authCheck will handle the redirection/error.
app.use('/api', authCheck, apiRoutes);

// Main application route - PROTECTED
// This ensures that the main page (index.html) is only served if authenticated.
// This MUST come BEFORE app.use(express.static) for the root '/' to be protected.
app.get('/', authCheck, (req, res) => {
    // If authCheck passes, the user is authenticated, so send the main app page
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Serve static files *after* protected routes that might intercept the root.
// This will serve CSS, client-side JS (like your index.html's script), images
// directly when requested, but the initial '/' request will hit the GET '/' route first.
app.use(express.static(path.join(__dirname, 'public')));

// Optional: Handle logout
app.get('/logout', (req, res) => {
    req.logout((err) => { // Passport's logout method
        if (err) { return next(err); }
        res.redirect('/'); // Redirect to homepage after logout
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
