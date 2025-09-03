// server.js

const express = require('express');
const app = express();
const passport = require('passport');
const session = require('express-session');
const path = require('path');
require('dotenv').config(); // Load environment variables from .env
const fs = require('fs'); // Import file system module for reading HTML

// Import necessary services and utilities
const db = require('./utils/db'); // Ensure this path is correct
const mailService = require('./services/mail-service'); // Import mailService

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

// --- User Info Endpoint ---
app.get('/user', authCheck, (req, res) => {
    if (req.user) {
        res.json({
            id: req.user.id,
            displayName: req.user.displayName,
            email: req.user.email || 'N/A'
        });
    } else {
        res.status(401).json({ message: 'User not authenticated.' });
    }
});

// --- Twilio Status Callback Endpoint ---
app.post('/twilio-status-callback', express.urlencoded({ extended: true }), (req, res) => {
    const { MessageSid, MessageStatus, To, From, ApiVersion, AccountSid, ErrorCode, ErrorMessage } = req.body;

    console.log(`[Twilio Callback] Received: SID=${MessageSid}, Status=${MessageStatus}, To=${To}, From=${From}`);
    console.log(`[Twilio Callback] Full body:`, req.body);

    if (!MessageSid || !MessageStatus) {
        console.warn('[Twilio Callback] Received incomplete Twilio status callback. Missing SID or Status.');
        return res.status(400).send('Missing required parameters.');
    }

    try {
        db.updateSmsStatus(MessageSid, MessageStatus, ErrorCode, ErrorMessage);
        console.log(`[Twilio Callback] Database updated for SID ${MessageSid} with status ${MessageStatus}.`);
        res.status(200).send('Callback received and processed.');
    } catch (error) {
        console.error(`[Twilio Callback] Error processing Twilio status callback for SID ${MessageSid}:`, error.message);
        res.status(500).send('Error processing callback.');
    }
});

// --- Twilio Incoming Message Callback Endpoint ---
app.post('/twilio-reply-callback', express.urlencoded({ extended: true }), async (req, res) => {
    console.log('[Twilio Reply Callback] Received message:', req.body);

    const { From: recipientNumber, To: twilioNumber, Body: messageBody } = req.body;

    if (!recipientNumber || !messageBody) {
        console.error('[Twilio Reply Callback] Missing required parameters (From or Body).');
        return res.status(400).send('Missing required parameters.');
    }

    try {
        const lastSentSms = await db.getLastSentSmsToNumber(recipientNumber);

        if (lastSentSms && lastSentSms.senderUserId) {
            console.log(`[Twilio Reply Callback] Found last message sent to ${recipientNumber} by user ID: ${lastSentSms.senderUserId}`);

            // NEW: Convert senderUserId to an integer before lookup
            const originalSenderUser = await db.findUserById(parseInt(lastSentSms.senderUserId, 10));

            if (originalSenderUser && originalSenderUser.email) {
                console.log(`[Twilio Reply Callback] Original sender email found: ${originalSenderUser.email}`);
                
                // Pass lastSentSms.recipientName to the mailService.sendReplyEmail function
                await mailService.sendReplyEmail(
                    originalSenderUser.email,
                    originalSenderUser.displayName || 'App User',
                    lastSentSms.recipientName || recipientNumber, // Use stored recipientName, fallback to phone number
                    recipientNumber, // This is the actual phone number of the person who replied
                    messageBody,
                    lastSentSms.originalMessageBody
                );
                console.log(`[Twilio Reply Callback] Reply email sent to ${originalSenderUser.email}.`);
            } else {
                console.error(`[Twilio Reply Callback] Original sender's email or display name not found for user ID: ${lastSentSms.senderUserId}. Found user object:`, originalSenderUser);
            }
        } else {
            console.warn(`[Twilio Reply Callback] No recent sent SMS found for ${recipientNumber}. Cannot route reply.`);
        }

        res.status(200).send('<Response></Response>');

    } catch (error) {
        console.error(`[Twilio Reply Callback] Error processing incoming SMS from ${recipientNumber}:`, error);
        res.status(500).send('<Response></Response>');
    }
});


// Serve static files *after* protected routes that might intercept the root.
app.use(express.static(path.join(__dirname, 'public')));

// Optional: Handle logout
app.get('/logout', (req, res) => {
    req.logout((err) => {
        if (err) { 
            console.error("Error during logout:", err);
            return res.status(500).send("Error logging out.");
        }
        res.redirect('/login');
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});