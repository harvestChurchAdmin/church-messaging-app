// middleware/config/passport-setup.js

const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

// --- Passport Serialization and Deserialization ---
// We need to pass enough info to deserialize the user for display.
// For now, we'll store the relevant parts of the Google profile.
passport.serializeUser((user, done) => {
    // We're storing Google's unique ID and display name in the session.
    // In a real app, 'user' here would be your database user object,
    // and you'd typically store user.id (your database ID).
    done(null, { id: user.id, displayName: user.displayName });
});

passport.deserializeUser((obj, done) => {
    // 'obj' here is what was passed from serializeUser (our { id, displayName } object).
    // In a real app, you'd use obj.id to find the user in your database.
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

        // This is where you'd typically check your database for the user:
        // User.findOne({ googleId: profile.id }).then((currentUser) => {
        //     if (currentUser) {
        //         // User already exists in our DB
        //         done(null, currentUser);
        //     } else {
        //         // Create new user in our DB
        //         new User({
        //             googleId: profile.id,
        //             displayName: profile.displayName,
        //             email: profile.emails && profile.emails.length > 0 ? profile.emails[0].value : null
        //         }).save().then((newUser) => {
        //             done(null, newUser);
        //         });
        //     }
        // });

        // For now, just pass the Google profile directly.
        // It will then be serialized by serializeUser.
        done(null, profile);
    })
);