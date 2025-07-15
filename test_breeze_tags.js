// test_breeze_tags.js

const axios = require('axios');
require('dotenv').config(); // Load environment variables from .env file
const http = require('http'); // Node.js built-in HTTP module

// Directly use the provided credentials from your .env file
const BREEZE_API_KEY = process.env.BREEZE_API_KEY;
const BREEZE_SUBDOMAIN = process.env.BREEZE_SUBDOMAIN;

// Basic validation
if (!BREEZE_API_KEY || !BREEZE_SUBDOMAIN) {
    console.error('Error: BREEZE_API_KEY or BREEZE_SUBDOMAIN not set in your .env file.');
    console.error('Please ensure your .env file contains:');
    console.error('BREEZE_API_KEY=YOUR_API_KEY');
    console.error('BREEZE_SUBDOMAIN=YOUR_SUBDOMAIN');
    process.exit(1);
}

const BREEZE_BASE_URL = `https://${BREEZE_SUBDOMAIN}.breezechms.com/api/`;

// Create an Axios instance with default headers
const breeze = axios.create({
    baseURL: BREEZE_BASE_URL,
    headers: {
        'Api-Key': BREEZE_API_KEY,
        'Content-Type': 'application/json'
    }
});

async function fetchAndDisplaySinglePersonData(res) {
    try {
        const personIdToTest = '51066325'; // Your specific person_id

        console.log(`Attempting to fetch single person data directly via /people/${personIdToTest}`);
        
        // Attempt to call the Breeze API directly via /people/{person_id} endpoint
        // This is a common REST API pattern for fetching a single resource by ID.
        const response = await breeze.get(`people/${personIdToTest}`);

        const personData = response.data; // Expecting a single person object or null/error
        const responseHeaders = response.headers;

        let htmlOutput = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Breeze Single Person Data (Direct ID)</title>
                <style>
                    body { font-family: monospace; white-space: pre-wrap; background-color: #f4f4f4; padding: 20px; }
                    .container { background-color: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); padding: 20px; }
                    h1 { color: #333; }
                    pre { background-color: #eee; padding: 15px; border-radius: 5px; overflow-x: auto; }
                    .error { color: red; }
                    .header-item { margin-bottom: 5px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>Breeze Single Person Data for ID: ${personIdToTest} (Direct Fetch)</h1>
                    <p>Status: ${response.status} ${response.statusText}</p>
                    <h2>Response Headers:</h2>
                    <pre>${JSON.stringify(responseHeaders, null, 2)}</pre>
                    <h2>Raw Response Data (Body - Full Person Object):</h2>
                    <pre>${JSON.stringify(personData, null, 2)}</pre>
        `;

        // Check if personData is a valid object (not null, false, or empty array)
        if (personData && typeof personData === 'object' && !Array.isArray(personData) && Object.keys(personData).length > 0) {
            htmlOutput += `<h2>Parsed Person Object:</h2>`;
            htmlOutput += `<pre>${JSON.stringify(personData, null, 2)}</pre>`;
            
            // Attempt to find phone numbers based on common patterns
            let foundPhoneNumber = 'Not Found';
            // Check for a 'phone_numbers' array (common in many APIs)
            if (personData.phone_numbers && Array.isArray(personData.phone_numbers)) {
                const mobile = personData.phone_numbers.find(p => p.type === 'Mobile');
                if (mobile && mobile.number) {
                    foundPhoneNumber = `Mobile (via phone_numbers array): ${mobile.number}`;
                } else if (personData.phone_numbers.length > 0) {
                    foundPhoneNumber = `First Phone (via phone_numbers array): ${personData.phone_numbers[0].number}`;
                }
            } 
            // Check for the specific field ID '1413026988' we found in the update payload
            else if (personData['1413026988'] && Array.isArray(personData['1413026988'])) {
                 const mobileEntry = personData['1413026988'].find(entry => 
                    entry && entry.details && entry.details.phone_mobile
                );
                if (mobileEntry) {
                    foundPhoneNumber = `Mobile (via 1413026988 field ID): ${mobileEntry.details.phone_mobile}`;
                }
            }

            htmlOutput += `<h3>Phone Number Check: ${foundPhoneNumber}</h3>`;

        } else {
            htmlOutput += `<p class="error">No comprehensive person data found for ID ${personIdToTest} or response is unexpected.</p>`;
        }

        htmlOutput += `
                </div>
            </body>
            </html>
        `;

        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(htmlOutput);

    } catch (error) {
        console.error('\n--- Error during API Call ---');
        let errorMessage = 'An unknown error occurred.';
        if (error.response) {
            console.error('Breeze API Error Response Status:', error.response.status);
            console.error('Breeze API Error Response Data:', JSON.stringify(error.response.data, null, 2));
            errorMessage = `Breeze API Error: Status ${error.response.status}, Data: ${JSON.stringify(error.response.data)}`;
        } else if (error.request) {
            console.error('No response received from Breeze API. Network issue?');
            errorMessage = 'Network Error: No response received from Breeze API.';
        } else {
            console.error('Error setting up Axios request:', error.message);
            errorMessage = `Request Setup Error: ${error.message}`;
        }

        res.writeHead(500, { 'Content-Type': 'text/html' });
        res.end(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Error</title>
            </head>
            <body>
                <h1>Error Fetching Data</h1>
                <p class="error">${errorMessage}</p>
                <p>Please check your console for more details.</p>
            </body>
            </html>
        `);
    }
}

// Create a simple HTTP server to display the output in the browser
const PORT = 8080; // You can change this port if 8080 is in use

const server = http.createServer((req, res) => {
    if (req.url === '/') {
        fetchAndDisplaySinglePersonData(res);
    } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
    }
});

server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Open your browser to http://localhost:${PORT} to view the single person data.`);
});
