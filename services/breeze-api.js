// services/breeze-api.js

const axios = require('axios');

require('dotenv').config();

const BREEZE_API_KEY = process.env.BREEZE_API_KEY;
const BREEZE_SUBDOMAIN = process.env.BREEZE_SUBDOMAIN;

// Basic validation for Breeze API keys
if (!BREEZE_API_KEY || !BREEZE_SUBDOMAIN) {
    console.error('Error: BREEZE_API_KEY or BREEZE_SUBDOMAIN not set.');
    console.error('Please ensure .env file contains BREEZE_API_KEY and BREEZE_SUBDOMAIN.');
    process.exit(1); // Exit if essential env variables are missing
}

const BREEZE_BASE_URL = `https://${BREEZE_SUBDOMAIN}.breezechms.com/api/`;

// Create an Axios instance with default headers for Breeze API
const breeze = axios.create({
    baseURL: BREEZE_BASE_URL,
    headers: {
        'Api-Key': BREEZE_API_KEY,
        'Content-Type': 'application/json'
    }
});

/**
 * Fetches people data from the Breeze API.
 * This is typically used for bulk fetching with filters, but may not return full details.
 * @param {object} params - Query parameters for the API call (e.g., filter_json, fields_json).
 * @returns {Promise<Array>} A promise that resolves to an array of people objects.
 */
async function getPeople(params = {}) {
    try {
        const response = await breeze.get('people', { params });
        return response.data;
    } catch (error) {
        console.error('Error fetching people from Breeze API:', error.message);
        if (error.response) {
            console.error('Breeze API Response Error:', error.response.status, error.response.data);
        }
        throw error; // Re-throw to be handled by the caller
    }
}

/**
 * Fetches a single person's detailed profile from the Breeze API by their ID.
 * This endpoint is observed to return full 'details' including phone numbers.
 * @param {string} personId - The ID of the person to fetch.
 * @returns {Promise<Object>} A promise that resolves to a single person object with full details.
 */
async function getPeopleById(personId) {
    try {
        const response = await breeze.get(`people/${personId}`);
        return response.data; // This should be the single person object
    } catch (error) {
        console.error(`Error fetching person ID ${personId} from Breeze API:`, error.message);
        if (error.response) {
            console.error('Breeze API Response Error:', error.response.status, error.response.data);
        }
        throw error;
    }
}

/**
 * Fetches all tag folders from the Breeze API.
 * Uses the confirmed working endpoint 'tags/list_folders'.
 * Ensures the returned data is always an array.
 * @returns {Promise<Array>} A promise that resolves to an array of tag folder objects.
 */
async function getTagFolders() {
    try {
        const response = await breeze.get('tags/list_folders');
        
        // Breeze API sometimes returns an object where keys are folder IDs.
        // Convert it to an array of folder objects if it's an object.
        if (typeof response.data === 'object' && response.data !== null && !Array.isArray(response.data)) {
            return Object.values(response.data);
        }
        return response.data; // Already an array or other expected format
    } catch (error) {
        console.error('Error fetching tag folders from Breeze API:', error.message);
        if (error.response) {
            console.error('Breeze API Response Error:', error.response.status, error.response.data);
        }
        throw error;
    }
}

/**
 * Fetches tags within a specific folder from the Breeze API.
 * Uses the endpoint 'tags/list_tags' with a 'folder_id' parameter.
 * Ensures the returned data is always an array.
 * @param {string} folderId - The ID of the tag folder.
 * @returns {Promise<Array>} A promise that resolves to an array of tag objects within the specified folder.
 */
async function getTagsInFolder(folderId) {
    try {
        const response = await breeze.get(`tags/list_tags`, {
            params: {
                folder_id: folderId
            }
        });
        // Similar conversion for tags within a folder if they come as an object
        if (typeof response.data === 'object' && response.data !== null && !Array.isArray(response.data)) {
            return Object.values(response.data);
        }
        return response.data;
    } catch (error) {
        console.error(`Error fetching tags in folder ${folderId} from Breeze API:`, error.message);
        if (error.response) {
            console.error('Breeze API Response Error:', error.response.status, error.response.data);
        }
        throw error;
    }
}

module.exports = {
    getPeople,
    getPeopleById,
    getTagFolders,
    getTagsInFolder,
};
