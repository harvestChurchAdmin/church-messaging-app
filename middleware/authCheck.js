// middleware/authCheck.js

const authCheck = (req, res, next) => {
    // Check if user is authenticated by Passport
    if (!req.isAuthenticated || !req.isAuthenticated()) {
        console.log('User not authenticated.');
        
        // Explicitly check if the request path starts with '/api/'.
        // This ensures that only true API calls receive a JSON 401.
        // All other requests (like the root '/') will be redirected to login.
        if (req.path.startsWith('/api/')) { //
            console.log('Detected API request for path:', req.path, '. Sending 401 Unauthorized.'); //
            return res.status(401).json({ message: 'Unauthorized: Please log in.' }); //
        } else {
            // For all other routes (like '/', which serves index.html), redirect to login page
            console.log('Detected page request for path:', req.path, '. Redirecting to login.'); //
            return res.redirect('/auth/login'); //
        }
    }
    // If authenticated, proceed to the next middleware/route handler
    next();
};

module.exports = authCheck;