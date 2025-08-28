// middleware/config/passport-setup.js

const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const db = require('../../utils/db'); // Import the database utility

// --- Passport Serialization and Deserialization ---
// serializeUser determines which data of the user object should be stored in the session.
// Here, we store the *internal database ID* of the user, not their Google ID.
passport.serializeUser((user, done) => {
    // 'user' here is the user object returned by db.upsertUser (which includes the internal 'id')
    done(null, user.id); // Store the internal database ID in the session
});

// deserializeUser retrieves the user object based on the stored session ID.
passport.deserializeUser((id, done) => {
    // 'id' here is the internal database ID stored during serialization.
    console.log('Deserializing user with internal DB ID:', id); // For debugging
    try {
        const user = db.findUserById(id); // Directly call the synchronous function
        if (user) {
            console.log('Deserialized user object:', user);
            done(null, user); // Pass the full user object to req.user
        } else {
            console.error('User not found during deserialization for ID:', id);
            done(new Error('User not found'), null);
        }
    } catch (err) {
        console.error('Error during deserialization:', err);
        done(err, null);
    }
});


// --- Google OAuth 2.0 Strategy Configuration ---
passport.use(
    new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL
    }, async (accessToken, refreshToken, profile, done) => {
        console.log('Google profile received:', profile.id, profile.displayName);

        try {
            // Use the upsertUser function to either find and update, or create a new user.
            // profile.id is Google's unique ID for the user (googleId in your DB).
            const currentUser = await db.upsertUser({
                googleId: profile.id,
                displayName: profile.displayName,
                email: profile.emails?.[0]?.value, // Assuming email is available and usually the first one
                photos: profile.photos // Passport profile provides this as an array of objects
            });

            console.log('User has logged in successfully:', currentUser);
            // Pass the user object (from your database, which includes internal 'id') to serializeUser
            done(null, currentUser);

        } catch (err) {
            console.error('Error during Google OAuth callback:', err);
            done(err, null);
        }
    })
);
