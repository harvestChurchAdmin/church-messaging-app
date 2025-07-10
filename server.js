// server.js

// --- 1. Import the Express library ---
// We bring in the Express module to create our web application.
const express = require('express');

// --- 2. Create an Express application instance ---
// This 'app' object will be used to configure our server, define routes, etc.
const app = express();

// --- 3. Define the port our server will listen on ---
// We'll use port 3000 for development. You can access it in your browser via http://localhost:3000
const PORT = process.env.PORT || 3000;

// --- 4. Configure middleware (optional, but good practice) ---
// app.use(express.json()); // Middleware to parse JSON request bodies
// app.use(express.urlencoded({ extended: true })); // Middleware to parse URL-encoded request bodies

// --- 5. Define a basic route (endpoint) ---
// When someone visits the root URL (e.g., http://localhost:3000/), this function will run.
// 'req' is the request object (incoming data from the client).
// 'res' is the response object (what we send back to the client).
app.get('/', (req, res) => {
    res.send('Hello from your messaging app backend!');
});

// --- 6. Start the server ---
// The server will begin listening for incoming requests on the specified port.
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Open your browser to: http://localhost:${PORT}`);
});