// server.js

const express = require('express');
const app = express();
const passport = require('passport');
const session = require('express-session');
const path = require('path');
require('dotenv').config(); // Load environment variables from .env
const fs = require('fs'); // Import file system module for reading HTML

// Import routes and middleware
const apiRoutes = require('./routes/api-routes');
const authRoutes = require('./routes/auth-routes');
const authCheck = require('./middleware/authCheck');
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
app.use('/api', authCheck, apiRoutes);

// Root route - serves the main application page after authentication check
app.get('/', authCheck, (req, res) => {
    // Read the index.html file dynamically
    let indexHtml = fs.readFileSync(path.join(__dirname, 'public', 'index.html'), 'utf8');
    
    // Replace the placeholder with the actual logo URL from .env
    const appLogoUrl = process.env.APP_LOGO_URL || 'https://placehold.co/280x80/cccccc/333333?text=Your+Logo+Here';
    // Ensure global replacement for all instances of the placeholder
    indexHtml = indexHtml.replace(/\{\{APP_LOGO_URL\}\}/g, appLogoUrl); 

    // Add cache-control headers to prevent caching of this page
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    res.send(indexHtml);
});

// Login route - Special handling to inject logo URL
app.get('/login', (req, res) => {
    // Read the login.html file dynamically
    let loginHtml = fs.readFileSync(path.join(__dirname, 'public', 'login.html'), 'utf8');
    
    // Replace the placeholder with the actual logo URL from .env
    const appLogoUrl = process.env.APP_LOGO_URL || 'https://placehold.co/280x80/cccccc/333333?text=Your+Logo+Here';
    // Ensure global replacement for all instances of the placeholder
    loginHtml = loginHtml.replace(/\{\{APP_LOGO_URL\}\}/g, appLogoUrl); 

    // Add cache-control headers to prevent caching of this page
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    res.send(loginHtml);
});


// Serve static files *after* protected routes that might intercept the root.
// This will serve CSS, client-side JS (like your index.html's script), images
// directly when requested, but the initial '/' request will hit the GET '/' route first.
app.use(express.static(path.join(__dirname, 'public')));

// Optional: Handle logout
app.get('/logout', (req, res) => {
    req.logout((err) => { // Passport's logout method
        if (err) { 
            console.error("Error during logout:", err);
            return res.status(500).send("Error logging out.");
        }
        res.redirect('/login'); // Redirect to the login page after logout
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
