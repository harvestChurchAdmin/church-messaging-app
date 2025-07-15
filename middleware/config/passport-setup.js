// middleware/config/passport-setup.js

const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
// const path = require('path'); // Only needed if you use path here, removed for simplicity if not used

// --- Passport Serialization and Deserialization ---
// We need to pass enough info to deserialize the user for display.
passport.serializeUser((user, done) => {
    // We're storing Google's unique ID and display name in the session.
    // 'user' here is the 'profile' object passed from the GoogleStrategy 'done' callback.
    done(null, { id: user.id, displayName: user.displayName });
});

passport.deserializeUser((obj, done) => {
    // 'obj' here is what was passed from serializeUser (our { id, displayName } object).
    console.log('Deserializing user object:', obj); // For debugging
    done(null, obj); // Pass the stored object as the user
});


// --- Google OAuth 2.0 Strategy Configuration ---
passport.use(
    new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL
    }, (accessToken, refreshToken, profile, done) => {
        console.log('Google profile received:', profile.id, profile.displayName);

        // In a real app, you'd check your database for the user here.
        // For now, just pass the Google profile directly to serializeUser.
        done(null, profile);
    })
);
