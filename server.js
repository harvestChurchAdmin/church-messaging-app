// server.js

// 1. Import necessary modules
const express = require('express');
const path = require('path');
const apiRoutes = require('./routes/api-routes');
const authRoutes = require('./routes/auth-routes'); // <-- ADD THIS LINE
const passportSetup = require('./middleware/config/passport-setup'); // Assuming you import your passport setup
const session = require('express-session'); // <-- Ensure this is imported for sessions
const passport = require('passport'); // <-- Ensure this is imported

require('dotenv').config();

// 2. Initialize the Express application
const app = express();
const PORT = process.env.PORT || 3000;

// 3. Middleware
app.use(express.json()); // For parsing application/json
app.use(express.static(path.join(__dirname, 'public'))); // Serve static files

// Configure session middleware
// IMPORTANT: In a production environment, you would use a more robust
// session store (like connect-mongo or connect-pg-simple) instead of
// the default in-memory store, which is not scalable or persistent.
app.use(session({
    secret: process.env.SESSION_SECRET || 'a very secret key', // Use a strong, unique secret from .env
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
        // secure: true // Uncomment in production with HTTPS
    }
}));

// Initialize Passport and session support
app.use(passport.initialize());
app.use(passport.session());

// 4. API Routes
app.use('/api', apiRoutes);
app.use('/auth', authRoutes); // <-- ADD THIS LINE to mount your auth routes

// 5. Basic Route for the Homepage
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// A simple status endpoint to check if user is logged in (used by frontend)
app.get('/status', (req, res) => {
    if (req.isAuthenticated()) {
        res.send(`Logged in as: ${req.user.displayName}.`);
    } else {
        res.send('Not logged in.');
    }
});


// 6. Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log('Press Ctrl+C to stop the server');
});