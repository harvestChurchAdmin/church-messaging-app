// services/breeze-api.js

// 1. Import necessary modules
const axios = require('axios'); // For making HTTP requests

// 2. Load environment variables (ensure .env is configured correctly)
require('dotenv').config();

// Get Breeze API Key and Subdomain from environment variables
const BREEZE_API_KEY = process.env.BREEZE_API_KEY;
const BREEZE_SUBDOMAIN = process.env.BREEZE_SUBDOMAIN;

// Construct the base URL for the Breeze API
// IMPORTANT: Ensure there is no '/v1' in the baseURL as per your previous successful attempt
const BREEZE_BASE_URL = `https://${BREEZE_SUBDOMAIN}.breezechms.com/api/`;

// Create an Axios instance with default configurations for Breeze API
const breeze = axios.create({
    baseURL: BREEZE_BASE_URL,
    headers: {
        'Api-Key': BREEZE_API_KEY,
        'Content-Type': 'application/json'
    }
});

/**
 * Fetches a list of people from the Breeze API.
 * @param {object} params - Optional parameters for the API request (e.g., { limit: 5 }).
 * @returns {Promise<Array>} - A promise that resolves to an array of person objects.
 */
async function getPeople(params = {}) {
    try {
        console.log(`Attempting to fetch people from Breeze API: ${breeze.defaults.baseURL}people`);
        const response = await breeze.get('people', { params });
        // The Breeze API response usually has data directly in response.data
        return response.data;
    } catch (error) {
        console.error('Error fetching people from Breeze:', error.message);
        if (error.response) {
            // The request was made and the server responded with a status code
            // that falls out of the range of 2xx
            console.error('Breeze API Response Error:', error.response.status, error.response.data);
            throw new Error(`Breeze API Error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
        } else if (error.request) {
            // The request was made but no response was received
            console.error('Breeze API No Response:', error.request);
            throw new Error('No response received from Breeze API.');
        } else {
            // Something happened in setting up the request that triggered an Error
            console.error('Error setting up Breeze API request:', error.message);
            throw new Error(`Error setting up Breeze API request: ${error.message}`);
        }
    }
}

// Export the functions you want to make available to other parts of your application
module.exports = {
    getPeople
};